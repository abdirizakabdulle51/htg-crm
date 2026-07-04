# Keycloak Setup

The API expects JWTs issued by the `htg-crm` realm and validates them with the realm JWKS endpoint:

`{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs`

## Required Realm Roles

Create these realm roles:

- `ACCOUNT_MANAGER`
- `COUNTRY_GM`
- `HEAD_OF_BUSINESS`
- `CEO`
- `ADMIN`

The API reads `realm_access.roles[0]` as the user's active CRM role.

## Required Custom Claims

Configure Keycloak protocol mappers on the frontend/API clients so access tokens include:

- `country_office_id`: single UUID string
- `regions`: JSON array of UUID strings
- `sectors`: JSON array of UUID strings

Suggested mapper setup:

- Mapper type: `User Attribute`
- Add to access token: enabled
- Claim JSON type:
  - `String` for `country_office_id`
  - `JSON` or multivalued string for `regions`
  - `JSON` or multivalued string for `sectors`

Store the same names as user attributes on each Keycloak user:

- `country_office_id`
- `regions`
- `sectors`

The API rejects tokens that do not have a valid UUID `sub` claim or at least one realm role. Missing `country_office_id`, `regions`, or `sectors` claims are treated as empty values.
