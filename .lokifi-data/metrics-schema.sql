-- Lokifi Metrics Database Schema
-- Version: 3.0.0-alpha
-- Created: October 8, 2025

-- Service Health Metrics
CREATE TABLE IF NOT EXISTS service_health (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    service_name TEXT NOT NULL,
    status TEXT NOT NULL,  -- 'running', 'stopped', 'error'
    response_time_ms INTEGER,
    cpu_percent REAL,
    memory_mb REAL,
    container_id TEXT,
    error_message TEXT
);

-- API Response Times
CREATE TABLE IF NOT EXISTS api_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER NOT NULL,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    error_message TEXT
);

-- System Performance
CREATE TABLE IF NOT EXISTS system_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    cpu_percent REAL NOT NULL,
    memory_percent REAL NOT NULL,
    memory_available_mb REAL NOT NULL,
    disk_free_gb REAL NOT NULL,
    disk_percent REAL NOT NULL,
    network_sent_mb REAL,
    network_recv_mb REAL
);

-- Docker Metrics
CREATE TABLE IF NOT EXISTS docker_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    container_name TEXT NOT NULL,
    container_id TEXT NOT NULL,
    cpu_percent REAL,
    memory_usage_mb REAL,
    memory_limit_mb REAL,
    network_rx_mb REAL,
    network_tx_mb REAL,
    block_read_mb REAL,
    block_write_mb REAL,
    status TEXT
);

-- Cache Performance
CREATE TABLE IF NOT EXISTS cache_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    cache_key TEXT NOT NULL,
    operation TEXT NOT NULL,  -- 'hit', 'miss', 'clear'
    ttl_seconds INTEGER,
    size_bytes INTEGER
);

-- Alerts History
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    severity TEXT NOT NULL,  -- 'info', 'warning', 'error', 'critical'
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    details TEXT,
    resolved BOOLEAN DEFAULT 0,
    resolved_at DATETIME
);

-- Command Usage Analytics
CREATE TABLE IF NOT EXISTS command_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    command TEXT NOT NULL,
    alias_used BOOLEAN DEFAULT 0,
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT 1,
    error_message TEXT,
    user_profile TEXT
);

-- Performance Baselines (for anomaly detection)
CREATE TABLE IF NOT EXISTS performance_baselines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL UNIQUE,
    baseline_value REAL NOT NULL,
    std_deviation REAL,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    sample_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_service_health_timestamp ON service_health(timestamp);
CREATE INDEX IF NOT EXISTS idx_service_health_service ON service_health(service_name);
CREATE INDEX IF NOT EXISTS idx_api_metrics_timestamp ON api_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_metrics_endpoint ON api_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_docker_metrics_timestamp ON docker_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_docker_metrics_container ON docker_metrics(container_name);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_timestamp ON cache_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_command_usage_timestamp ON command_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_command_usage_command ON command_usage(command);

-- Views for common queries
CREATE VIEW IF NOT EXISTS v_service_health_latest AS
SELECT 
    service_name,
    status,
    response_time_ms,
    cpu_percent,
    memory_mb,
    timestamp,
    ROW_NUMBER() OVER (PARTITION BY service_name ORDER BY timestamp DESC) as rn
FROM service_health
WHERE rn = 1;

CREATE VIEW IF NOT EXISTS v_api_performance_summary AS
SELECT 
    endpoint,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_ms,
    MIN(response_time_ms) as min_response_ms,
    MAX(response_time_ms) as max_response_ms,
    SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as error_count,
    DATE(timestamp) as date
FROM api_metrics
GROUP BY endpoint, DATE(timestamp);

CREATE VIEW IF NOT EXISTS v_cache_hit_rate AS
SELECT 
    DATE(timestamp) as date,
    CAST(SUM(CASE WHEN operation = 'hit' THEN 1 ELSE 0 END) AS REAL) / 
    COUNT(*) * 100 as hit_rate_percent,
    COUNT(*) as total_operations
FROM cache_metrics
GROUP BY DATE(timestamp);

CREATE VIEW IF NOT EXISTS v_active_alerts AS
SELECT *
FROM alerts
WHERE resolved = 0
ORDER BY 
    CASE severity
        WHEN 'critical' THEN 1
        WHEN 'error' THEN 2
        WHEN 'warning' THEN 3
        WHEN 'info' THEN 4
    END,
    timestamp DESC;

-- Initial baselines (will be updated with real data)
INSERT OR IGNORE INTO performance_baselines (metric_name, baseline_value, std_deviation) VALUES
('service_response_time_ms', 1000, 200),
('cpu_percent', 50, 15),
('memory_percent', 60, 10),
('cache_hit_rate', 80, 10);
