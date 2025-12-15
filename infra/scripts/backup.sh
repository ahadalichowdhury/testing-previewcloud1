#!/bin/bash

# PreviewCloud Backup Script
# Backs up all databases and uploads to S3 (optional)

set -e

BACKUP_DIR="/opt/backups/previewcloud"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
TEMP_BACKUP_DIR="$BACKUP_DIR/temp-$DATE"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  PreviewCloud Backup - $(date)${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Create backup directory
mkdir -p "$TEMP_BACKUP_DIR"

# Backup MongoDB (Platform)
echo -e "${YELLOW}📦 Backing up MongoDB (Platform)...${NC}"
docker exec mongodb-platform mongodump --out /backup/$DATE --quiet
docker cp mongodb-platform:/backup/$DATE "$TEMP_BACKUP_DIR/mongodb-platform"
docker exec mongodb-platform rm -rf /backup/$DATE
echo -e "${GREEN}✅ MongoDB platform backed up${NC}"

# Backup PostgreSQL
echo -e "${YELLOW}📦 Backing up PostgreSQL...${NC}"
docker exec postgres-previews pg_dumpall -U previewcloud > "$TEMP_BACKUP_DIR/postgres.sql"
echo -e "${GREEN}✅ PostgreSQL backed up${NC}"

# Backup MySQL
echo -e "${YELLOW}📦 Backing up MySQL...${NC}"
MYSQL_PASSWORD=$(grep MYSQL_PASSWORD /opt/previewcloud/infra/.env | cut -d '=' -f2)
docker exec mysql-previews mysqldump -u root -p"$MYSQL_PASSWORD" --all-databases > "$TEMP_BACKUP_DIR/mysql.sql"
echo -e "${GREEN}✅ MySQL backed up${NC}"

# Backup MongoDB (Previews)
echo -e "${YELLOW}📦 Backing up MongoDB (Previews)...${NC}"
docker exec mongodb-previews mongodump --out /backup/$DATE --quiet
docker cp mongodb-previews:/backup/$DATE "$TEMP_BACKUP_DIR/mongodb-previews"
docker exec mongodb-previews rm -rf /backup/$DATE
echo -e "${GREEN}✅ MongoDB previews backed up${NC}"

# Backup configuration files
echo -e "${YELLOW}📦 Backing up configuration...${NC}"
cp -r /opt/previewcloud/infra/traefik "$TEMP_BACKUP_DIR/"
cp /opt/previewcloud/backend/.env "$TEMP_BACKUP_DIR/backend.env" 2>/dev/null || true
echo -e "${GREEN}✅ Configuration backed up${NC}"

# Compress backup
echo -e "${YELLOW}📦 Compressing backup...${NC}"
cd "$BACKUP_DIR"
tar -czf "backup-$DATE.tar.gz" "temp-$DATE"
rm -rf "temp-$DATE"

BACKUP_SIZE=$(du -h "backup-$DATE.tar.gz" | cut -f1)
echo -e "${GREEN}✅ Backup compressed: $BACKUP_SIZE${NC}"

# Upload to S3 (optional)
if command -v aws &> /dev/null && [ ! -z "$AWS_S3_BUCKET" ]; then
    echo -e "${YELLOW}☁️  Uploading to S3...${NC}"
    aws s3 cp "backup-$DATE.tar.gz" "s3://$AWS_S3_BUCKET/backups/" --storage-class STANDARD_IA
    echo -e "${GREEN}✅ Uploaded to S3${NC}"
else
    echo -e "${YELLOW}⚠️  S3 upload skipped (AWS CLI not configured or AWS_S3_BUCKET not set)${NC}"
fi

# Cleanup old backups (keep last 7 days locally)
echo -e "${YELLOW}🗑️  Cleaning up old backups...${NC}"
find "$BACKUP_DIR" -name "backup-*.tar.gz" -type f -mtime +7 -delete
REMAINING_BACKUPS=$(ls -1 "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | wc -l)
echo -e "${GREEN}✅ Kept $REMAINING_BACKUPS recent backups${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✅ Backup completed successfully!${NC}"
echo -e "${GREEN}  📁 Location: $BACKUP_DIR/backup-$DATE.tar.gz${NC}"
echo -e "${GREEN}  💾 Size: $BACKUP_SIZE${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

