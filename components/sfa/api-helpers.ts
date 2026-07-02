// API helpers for SFA endpoints
export const apiCore = async (action: string, method = 'GET', body?: any) => {
  const o: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) o.body = JSON.stringify(body);
  return (await fetch(`/api/hq/sfa?action=${action}`, o)).json();
};

export const apiEnh = async (action: string, method = 'GET', body?: any) => {
  const o: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) o.body = JSON.stringify(body);
  return (await fetch(`/api/hq/sfa/enhanced?action=${action}`, o)).json();
};

export const apiAdv = async (action: string, method = 'GET', body?: any) => {
  const o: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) o.body = JSON.stringify(body);
  return (await fetch(`/api/hq/sfa/advanced?action=${action}`, o)).json();
};

export const apiCrm = async (action: string, method = 'GET', body?: any) => {
  const o: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) o.body = JSON.stringify(body);
  return (await fetch(`/api/hq/sfa/crm?action=${action}`, o)).json();
};

export const apiIE = async (action: string, method = 'GET', body?: any, query = '') => {
  const o: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) o.body = JSON.stringify(body);
  return (await fetch(`/api/hq/sfa/import-export?action=${action}${query}`, o)).json();
};
