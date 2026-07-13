/**
 * Auto-issue LMS certificate on course completion
 */
import { ensureCertificateTables, deriveStatus } from '../certificate-registry';
import { buildCertificateNumber, generateVerifyToken } from './course-service';

let sequelize: any;
try { sequelize = require('../../sequelize'); } catch {}

export async function issueCourseCertificate(opts: {
  tenantId: string | null;
  employeeId: string;
  employeeName: string;
  curriculumId: string;
  curriculumTitle: string;
  curriculumCode: string;
  validityMonths?: number | null;
  department?: string;
}): Promise<{ id: string; verifyToken: string; certificateNumber: string } | null> {
  if (!sequelize) return null;
  await ensureCertificateTables();

  const verifyToken = generateVerifyToken();
  const certificateNumber = buildCertificateNumber(opts.curriculumCode || 'CRS', opts.employeeId);
  const issued = new Date();
  let expiry: Date | null = null;
  if (opts.validityMonths && opts.validityMonths > 0) {
    expiry = new Date(issued);
    expiry.setMonth(expiry.getMonth() + opts.validityMonths);
  }

  const [rows] = await sequelize.query(`
    INSERT INTO hris_certificates (
      tenant_id, employee_id, employee_name, title, issuer, source,
      certificate_number, issued_date, expiry_date, status, department,
      verify_token, curriculum_id
    ) VALUES (
      :tid, :eid, :ename, :title, 'Humanify Academy', 'training',
      :num, :issued, :expiry, :status, :dept, :token, :cid
    ) RETURNING id, verify_token, certificate_number
  `, {
    replacements: {
      tid: opts.tenantId,
      eid: opts.employeeId,
      ename: opts.employeeName,
      title: `Sertifikat: ${opts.curriculumTitle}`,
      num: certificateNumber,
      issued: issued.toISOString().split('T')[0],
      expiry: expiry ? expiry.toISOString().split('T')[0] : null,
      status: deriveStatus(expiry ? expiry.toISOString().split('T')[0] : undefined),
      dept: opts.department || null,
      token: verifyToken,
      cid: opts.curriculumId,
    },
  });

  const cert = rows[0];
  if (!cert) return null;

  try {
    await sequelize.query(`
      INSERT INTO hris_lms_competency_history (
        tenant_id, employee_id, employee_name, competency_code, competency_name,
        level, score, source_type, source_id, certified_at, expires_at, certificate_id
      ) VALUES (
        :tid, :eid, :ename, :code, :cname, 'intermediate', 100, 'training', :cid, NOW(), :exp, :certId
      )
    `, {
      replacements: {
        tid: opts.tenantId,
        eid: opts.employeeId,
        ename: opts.employeeName,
        code: `COURSE_${(opts.curriculumCode || 'CRS').toUpperCase()}`,
        cname: opts.curriculumTitle,
        cid: opts.curriculumId,
        exp: expiry,
        certId: cert.id,
      },
    });
  } catch { /* table may not exist */ }

  return {
    id: cert.id,
    verifyToken: cert.verify_token,
    certificateNumber: cert.certificate_number,
  };
}

export async function verifyCertificateByToken(token: string) {
  if (!sequelize || !token) return null;
  await ensureCertificateTables();
  const [rows] = await sequelize.query(
    'SELECT * FROM hris_certificates WHERE verify_token = :token LIMIT 1',
    { replacements: { token } },
  );
  if (!rows.length) return null;
  const r = rows[0];
  const expiry = r.expiry_date ? String(r.expiry_date).split('T')[0] : null;
  return {
    valid: deriveStatus(expiry || undefined) !== 'expired' && r.status !== 'revoked',
    employeeName: r.employee_name,
    title: r.title,
    issuer: r.issuer,
    certificateNumber: r.certificate_number,
    issuedDate: r.issued_date ? String(r.issued_date).split('T')[0] : null,
    expiryDate: expiry,
    status: deriveStatus(expiry || undefined),
  };
}
