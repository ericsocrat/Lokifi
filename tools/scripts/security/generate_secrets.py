#!/usr/bin/env python3
"""
Secure Secret Generator for Lokifi
================================

This script generates cryptographically secure secrets for use in production.
Run this script to generate new secrets for your .env file.
"""

import secrets
import string
import argparse
from pathlib import Path

def generate_secret(length: int = 64) -> str:
    """Generate a cryptographically secure random string."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*(-_=+)"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_jwt_secret(length: int = 64) -> str:
    """Generate a JWT secret (URL-safe base64)."""
    return secrets.token_urlsafe(length)

def generate_password(length: int = 16) -> str:
    """Generate a secure password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def generate_all_secrets():
    """Generate all required secrets for Lokifi."""
    secrets_config = {
        "LOKIFI_JWT_SECRET": generate_jwt_secret(64),
        "JWT_SECRET_KEY": generate_jwt_secret(64), 
        "SECRET_KEY": generate_secret(64),
        "GRAFANA_ADMIN_PASSWORD": generate_password(20),
        "REDIS_WEB_PASSWORD": generate_password(20),
        "POSTGRES_PASSWORD": generate_password(24),
    }
    
    return secrets_config

def create_production_env(output_file: str = ".env.production"):
    """Create a production .env file with secure secrets."""
    secrets_config = generate_all_secrets()
    
    env_content = f"""# Lokifi Production Environment Configuration
# Generated on $(date)
# CRITICAL: Keep this file secure and never commit to version control

# ==========================================
# SECURITY SETTINGS - PRODUCTION
# ==========================================
LOKIFI_JWT_SECRET={secrets_config['LOKIFI_JWT_SECRET']}
JWT_SECRET_KEY={secrets_config['JWT_SECRET_KEY']}
SECRET_KEY={secrets_config['SECRET_KEY']}

# ==========================================
# DATABASE CONFIGURATION
# ==========================================
DATABASE_URL=postgresql://postgres:${{POSTGRES_PASSWORD}}@localhost:5432/lokifi_production
POSTGRES_PASSWORD={secrets_config['POSTGRES_PASSWORD']}

# ==========================================
# JWT CONFIGURATION
# ==========================================
LOKIFI_JWT_TTL_MIN=1440
JWT_EXPIRE_MINUTES=30

# ==========================================
# APPLICATION SETTINGS
# ==========================================
PROJECT_NAME=Lokifi
API_PREFIX=/api
ENVIRONMENT=production
DEBUG=false

# ==========================================
# FRONTEND CONFIGURATION
# ==========================================
FRONTEND_ORIGIN=https://your-domain.com
CORS_ORIGINS=["https://your-domain.com"]

# ==========================================
# REDIS CONFIGURATION
# ==========================================
REDIS_URL=redis://localhost:6379/0
REDIS_HOST=localhost
REDIS_PORT=6379

# ==========================================
# EMAIL CONFIGURATION
# ==========================================
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_TLS=true
FROM_EMAIL=noreply@your-domain.com

# ==========================================
# MONITORING PASSWORDS
# ==========================================
GRAFANA_ADMIN_PASSWORD={secrets_config['GRAFANA_ADMIN_PASSWORD']}
REDIS_WEB_PASSWORD={secrets_config['REDIS_WEB_PASSWORD']}

# ==========================================
# EXTERNAL API KEYS (Set these manually)
# ==========================================
# OPENAI_API_KEY=your-openai-key
# POLYGON_KEY=your-polygon-key
# ALPHAVANTAGE_KEY=your-alphavantage-key
# FINNHUB_KEY=your-finnhub-key

# ==========================================
# CLOUD STORAGE (Set these if using AWS)
# ==========================================
# AWS_ACCESS_KEY_ID=your-aws-access-key
# AWS_SECRET_ACCESS_KEY=your-aws-secret-key
# AWS_S3_BUCKET=your-s3-bucket

# ==========================================
# PRODUCTION DEPLOYMENT
# ==========================================
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
LOG_LEVEL=INFO
MAX_WORKERS=4
WORKER_TIMEOUT=30
"""
    
    with open(output_file, 'w') as f:
        f.write(env_content)
    
    print(f"✅ Production environment file created: {output_file}")
    print("🔒 IMPORTANT SECURITY NOTES:")
    print("   1. Never commit this file to version control")
    print("   2. Set proper file permissions (chmod 600)")
    print("   3. Update the placeholder values (domain, SMTP, API keys)")
    print("   4. Backup these secrets securely")
    
    return secrets_config

def display_secrets():
    """Display generated secrets for manual use."""
    secrets_config = generate_all_secrets()
    
    print("🔐 Generated Secure Secrets for Lokifi:")
    print("=" * 50)
    
    for key, value in secrets_config.items():
        print(f"{key}={value}")
    
    print("\n🔒 Security Guidelines:")
    print("1. Copy these to your .env file")
    print("2. Never share these secrets")
    print("3. Use different secrets for different environments")
    print("4. Rotate secrets regularly")
    print("5. Store backups securely")

def main():
    parser = argparse.ArgumentParser(description="Generate secure secrets for Lokifi")
    parser.add_argument("--output", "-o", default=".env.production", 
                       help="Output file for production environment (default: .env.production)")
    parser.add_argument("--display-only", "-d", action="store_true",
                       help="Only display secrets, don't create file")
    parser.add_argument("--force", "-f", action="store_true",
                       help="Overwrite existing file")
    
    args = parser.parse_args()
    
    if args.display_only:
        display_secrets()
        return
    
    output_path = Path(args.output)
    if output_path.exists() and not args.force:
        print(f"❌ File {args.output} already exists. Use --force to overwrite.")
        return
    
    create_production_env(args.output)

if __name__ == "__main__":
    main()