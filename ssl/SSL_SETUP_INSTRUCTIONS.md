# SSL Certificate Setup Instructions

## Option 1: Let's Encrypt (Recommended for production)
1. Install Certbot on your server
2. Run: certbot --nginx -d fynix.example.com
3. Test auto-renewal: certbot renew --dry-run

## Option 2: Self-signed certificates (Development only)
1. Generate certificate:
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 
   -keyout ssl/fynix.key -out ssl/fynix.crt
   -subj "/C=US/ST=State/L=City/O=Fynix/CN=fynix.example.com"

## Option 3: Commercial SSL Certificate
1. Generate CSR: openssl req -new -newkey rsa:2048 -nodes 
   -keyout ssl/fynix.key -out ssl/fynix.csr
2. Submit CSR to certificate authority
3. Install provided certificate as ssl/fynix.crt

## Update Domain
Replace 'fynix.example.com' with your actual domain in:
- nginx_ssl.conf
- docker-compose.production.yml
- .env.production
