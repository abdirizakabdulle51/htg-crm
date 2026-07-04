package main

import (
	"errors"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	flag.Parse()

	direction := "up"
	if flag.NArg() > 0 {
		direction = flag.Arg(0)
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	m, err := migrate.New("file://internal/migrations", databaseURL)
	if err != nil {
		log.Fatalf("create migrate client: %v", err)
	}
	defer func() {
		sourceErr, dbErr := m.Close()
		if sourceErr != nil {
			log.Printf("close migration source: %v", sourceErr)
		}
		if dbErr != nil {
			log.Printf("close migration database: %v", dbErr)
		}
	}()

	switch direction {
	case "up":
		err = m.Up()
	case "down":
		err = m.Down()
	default:
		log.Fatalf("unsupported migration direction %q", direction)
	}

	if errors.Is(err, migrate.ErrNoChange) {
		fmt.Println("no migration changes")
		return
	}
	if err != nil {
		log.Fatalf("run migrations: %v", err)
	}
}
