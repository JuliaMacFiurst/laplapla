# Customer accounts and product entitlements

Customer identity is provided by Supabase Auth. Product metadata stays in
`lib/shop/catalog.ts`; Supabase stores only ownership records.

## Supabase Auth redirect configuration

The production Site URL must be the public application, not the separate
admin application:

```text
https://www.laplapla.com
```

Keep these exact customer callbacks in Authentication → URL Configuration →
Redirect URLs:

```text
https://www.laplapla.com/auth/callback
https://www.laplapla.com/en/auth/callback
https://www.laplapla.com/he/auth/callback
```

For local testing, add the equivalent callback paths for the actual local
origin and port, for example `http://localhost:3000/auth/callback` and its
`/en` and `/he` variants. Admin callback URLs remain separate additional
redirect URLs; they must not be used as the Site URL fallback for customers.

The separate `upload-lessons` admin app uses a PKCE callback under `/login`.
If both applications share one Supabase project, keep these narrowly scoped
admin entries in addition to the customer callbacks:

```text
https://upload-lessons.vercel.app/login**
http://localhost:3001/login**
```

The `**` suffix is needed there only because the existing admin callback adds
an internal `?next=...` query. Do not use an origin-wide wildcard. The Google
OAuth console callback remains the Supabase project callback
`https://wazoncnmsxbjzvbjenpw.supabase.co/auth/v1/callback`; application
callbacks belong in Supabase Redirect URLs, not in the Google callback list.

## Grant a development/test entitlement

There is no public grant endpoint or free-product button. After the migration
has been applied, use the Supabase SQL editor (or another trusted service-role
database session) to grant Sound Case #001 to an existing Auth user:

```sql
select public.grant_product_entitlement(
  (select id from auth.users where lower(email) = lower('tester@example.com')),
  'sound-case-001',
  'promo'
);
```

The function is executable only by `service_role`. Running the same statement
again reactivates the same user/product/source entitlement.

To test a revocation without deleting the audit record:

```sql
update public.product_entitlements
set status = 'revoked'
where user_id = (
  select id from auth.users where lower(email) = lower('tester@example.com')
)
and product_id = 'sound-case-001';
```

Do not put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_*` variable or call
the grant function from browser code.
