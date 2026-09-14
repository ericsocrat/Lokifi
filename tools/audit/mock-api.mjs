import http from 'node:http';
const user = {id:'00000000-0000-0000-0000-000000000001', email:'audit@example.test', full_name:'Audit User', created_at:'2026-09-14T00:00:00Z'};
http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:13100');
  res.setHeader('Access-Control-Allow-Credentials','true');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Content-Type','application/json');
  if(req.method==='OPTIONS'){res.end();return;}
  if(req.url==='/api/auth/me'){res.end(JSON.stringify({user,profile:{username:'audit'}}));return;}
  res.writeHead(503);res.end(JSON.stringify({detail:'Isolated audit: service unavailable'}));
}).listen(18100,'127.0.0.1');
