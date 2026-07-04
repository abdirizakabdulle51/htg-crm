package targets

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	db *pgxpool.Pool
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{db: db}
}

func RegisterRoutes(r *gin.RouterGroup, db *pgxpool.Pool) {
	h := NewHandler(db)
	r.GET("/targets", h.List)
	r.POST("/targets", h.Upsert)
}

// Target represents one target row.
type Target struct {
	ID               string  `json:"id"`
	Quarter          int     `json:"quarter"`
	Year             int     `json:"year"`
	Country          *string `json:"country"`
	AccountManagerID *string `json:"account_manager_id"`
	TargetArrUsd     int64   `json:"target_arr_usd"`
	SetBy            *string `json:"set_by"`
	UpdatedAt        string  `json:"updated_at"`
}

// UpsertRequest is a single target to create or update.
type UpsertRequest struct {
	Quarter          int     `json:"quarter"          binding:"required,min=1,max=4"`
	Year             int     `json:"year"             binding:"required"`
	Country          *string `json:"country"`
	AccountManagerID *string `json:"account_manager_id"`
	TargetArrUsd     int64   `json:"target_arr_usd"   binding:"min=0"`
}

// GET /api/v1/targets?quarter=3&year=2026
func (h *Handler) List(c *gin.Context) {
	quarter, _ := strconv.Atoi(c.Query("quarter"))
	year, _ := strconv.Atoi(c.Query("year"))

	if quarter == 0 {
		quarter = currentQuarter()
	}
	if year == 0 {
		year = time.Now().Year()
	}

	rows, err := h.db.Query(c.Request.Context(), `
		SELECT id, quarter, year, country, account_manager_id,
		       target_arr_usd, set_by, updated_at
		FROM targets
		WHERE quarter = $1 AND year = $2
		ORDER BY country NULLS LAST, account_manager_id NULLS LAST
	`, quarter, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch targets"})
		return
	}
	defer rows.Close()

	var targets []Target
	for rows.Next() {
		var t Target
		var updatedAt time.Time
		if err := rows.Scan(
			&t.ID, &t.Quarter, &t.Year, &t.Country, &t.AccountManagerID,
			&t.TargetArrUsd, &t.SetBy, &updatedAt,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "scan error"})
			return
		}
		t.UpdatedAt = updatedAt.Format(time.RFC3339)
		targets = append(targets, t)
	}

	if targets == nil {
		targets = []Target{}
	}
	c.JSON(http.StatusOK, gin.H{"targets": targets, "quarter": quarter, "year": year})
}

// POST /api/v1/targets  — body: { "targets": [...UpsertRequest] }
func (h *Handler) Upsert(c *gin.Context) {
	var body struct {
		Targets []UpsertRequest `json:"targets" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Identify caller for audit
	callerID := c.GetString("user_id") // set by AuthMiddleware

	for _, req := range body.Targets {
		country := req.Country
		amID := req.AccountManagerID
		setBy := uuid.Nil.String()
		if callerID != "" {
			setBy = callerID
		}

		_, err := h.db.Exec(c.Request.Context(), `
			INSERT INTO targets (quarter, year, country, account_manager_id, target_arr_usd, set_by)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT ON CONSTRAINT targets_unique_idx
			DO UPDATE SET target_arr_usd = EXCLUDED.target_arr_usd,
			              set_by         = EXCLUDED.set_by,
			              updated_at     = NOW()
		`, req.Quarter, req.Year, country, amID, req.TargetArrUsd, setBy)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "upsert failed: " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"saved": len(body.Targets)})
}

func currentQuarter() int {
	m := int(time.Now().Month())
	return (m-1)/3 + 1
}
