package database

import (
	"context"
	"crypto/tls"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
)

type ClickHouseConfig struct {
	Addr     string
	Database string
	Username string
	Password string
	Secure   bool
}

func NewClickHouse(ctx context.Context, cfg ClickHouseConfig) (clickhouse.Conn, error) {
	options := &clickhouse.Options{
		Addr: []string{cfg.Addr},
		Auth: clickhouse.Auth{
			Database: cfg.Database,
			Username: cfg.Username,
			Password: cfg.Password,
		},
		DialTimeout: 10 * time.Second,
	}
	if cfg.Secure {
		options.TLS = &tls.Config{MinVersion: tls.VersionTLS12}
	}

	conn, err := clickhouse.Open(options)
	if err != nil {
		return nil, err
	}

	return conn, conn.Ping(ctx)
}
