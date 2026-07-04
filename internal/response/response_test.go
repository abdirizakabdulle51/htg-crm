package response

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestResponseHelpersEnvelope(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name       string
		handler    func(*gin.Context)
		statusCode int
		want       map[string]any
	}{
		{
			name: "success_single_object",
			handler: func(c *gin.Context) {
				Success(c, gin.H{"id": "abc123", "name": "Tenant"})
			},
			statusCode: http.StatusOK,
			want: map[string]any{
				"data":  map[string]any{"id": "abc123", "name": "Tenant"},
				"error": nil,
				"meta":  map[string]any{},
			},
		},
		{
			name: "success_list_with_pagination",
			handler: func(c *gin.Context) {
				SuccessList(c, []gin.H{{"id": "one"}, {"id": "two"}}, 142, 1, 20)
			},
			statusCode: http.StatusOK,
			want: map[string]any{
				"data": []any{
					map[string]any{"id": "one"},
					map[string]any{"id": "two"},
				},
				"error": nil,
				"meta": map[string]any{
					"total":       float64(142),
					"page":        float64(1),
					"limit":       float64(20),
					"total_pages": float64(8),
				},
			},
		},
		{
			name: "error",
			handler: func(c *gin.Context) {
				Error(c, http.StatusNotFound, CodeNotFound, "Resource does not exist")
			},
			statusCode: http.StatusNotFound,
			want: map[string]any{
				"data": nil,
				"error": map[string]any{
					"code":    CodeNotFound,
					"message": "Resource does not exist",
					"details": map[string]any{},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.GET("/", tt.handler)

			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, "/", nil)
			router.ServeHTTP(recorder, request)

			if recorder.Code != tt.statusCode {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.statusCode)
			}

			var got map[string]any
			if err := json.Unmarshal(recorder.Body.Bytes(), &got); err != nil {
				t.Fatalf("response is not JSON: %v", err)
			}

			if !reflect.DeepEqual(got, tt.want) {
				t.Fatalf("envelope mismatch\ngot:  %#v\nwant: %#v", got, tt.want)
			}
		})
	}
}
