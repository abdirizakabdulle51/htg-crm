package notifications

type NotificationType string

const (
	TypeWelcome         NotificationType = "WELCOME"
	TypeWonDeal         NotificationType = "WON_DEAL"
	TypeRiskAlert       NotificationType = "RISK_ALERT"
	TypeRenewalReminder NotificationType = "RENEWAL_REMINDER"
	TypeTargetBehind    NotificationType = "TARGET_BEHIND"
	TypeGeneral         NotificationType = "GENERAL"
)

const subjectPrefix = "[HTG CRM] "

var emailTemplates = map[NotificationType]string{
	TypeWelcome: `
<h2>Welcome to HTG CRM, {{.Name}}</h2>
<p>Your account has been created.</p>
<p><strong>Temporary password:</strong> {{.TempPassword}}</p>
<p>Please sign in and change this password immediately.</p>`,
	TypeWonDeal: `
<h2>Deal Won</h2>
<p>Congratulations! <strong>{{.CompanyName}}</strong> has been converted to a tenant.</p>
<p>Please add their HCS account ID and set up their first services.</p>`,
	TypeRiskAlert: `
<h2>Tenant Risk Alert</h2>
<p><strong>{{.TenantName}}</strong> has crossed the risk threshold.</p>
<p>Current risk score: <strong>{{.RiskScore}}</strong></p>
<p>Please review the account and plan next actions.</p>`,
	TypeRenewalReminder: `
<h2>Renewal Reminder</h2>
<p><strong>{{.TenantName}}</strong> has contract <strong>{{.ContractNumber}}</strong> expiring on {{.EndDate}}.</p>
<p>Please contact the customer and prepare the renewal plan.</p>`,
	TypeTargetBehind: `
<h2>Target Health Alert</h2>
<p>Your target health is currently <strong>RED</strong>.</p>
<p>{{.Advice}}</p>`,
	TypeGeneral: `
<h2>{{.Title}}</h2>
<p>{{.Body}}</p>`,
}
