package reports

import "context"

type Service struct {
	repository *Repository
}

func NewService(repository *Repository) *Service {
	return &Service{repository: repository}
}

func (s *Service) List(ctx context.Context) ([]Report, int, error) {
	items := []Report{{ID: "report-1", Name: "Revenue by country", Format: "csv"}}
	return items, len(items), nil
}
