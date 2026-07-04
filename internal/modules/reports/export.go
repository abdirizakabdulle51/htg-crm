package reports

import "context"

func Export(ctx context.Context, report Report) ([]byte, string, error) {
	return []byte("report_id,name\n" + report.ID + "," + report.Name + "\n"), "text/csv", nil
}
