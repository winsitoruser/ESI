import fs from 'fs';
import path from 'path';
import {
  mimeForUploadName,
  resolvePublicUploadFile,
} from '../lib/hris/public-upload-serve';

describe('public upload serve', () => {
  const dir = path.join(process.cwd(), 'public', 'uploads', 'letter-logos');
  const file = path.join(dir, 'logo-test-unit.png');

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  afterAll(() => {
    try { fs.unlinkSync(file); } catch { /* */ }
  });

  it('resolves a safe letter-logo filename', () => {
    expect(resolvePublicUploadFile('letter-logos', 'logo-test-unit.png')).toBe(path.resolve(file));
    expect(mimeForUploadName('logo-test-unit.png')).toBe('image/png');
    expect(mimeForUploadName('x.jpeg')).toBe('image/jpeg');
  });

  it('rejects path traversal and private folders', () => {
    expect(resolvePublicUploadFile('letter-logos', '../secret.png')).toBeNull();
    expect(resolvePublicUploadFile('letter-logos', 'a/b.png')).toBeNull();
    expect(resolvePublicUploadFile('employee-documents', 'x.png')).toBeNull();
    expect(resolvePublicUploadFile('letter-logos', 'x.txt')).toBeNull();
    expect(resolvePublicUploadFile('letter-logos', 'missing-nope.png')).toBeNull();
  });
});
