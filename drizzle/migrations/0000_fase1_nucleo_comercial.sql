-- ============ ENUMS ============
create type public.app_role as enum ('administrador','gestor','comercial','financeiro','producao','consulta');
create type public.member_status as enum ('pendente','ativo','inativo');
create type public.product_kind as enum ('fabricado','revendido','material');
create type public.presale_status as enum ('rascunho','em_contato','proposta','convertida','perdida');
create type public.quote_status as enum ('rascunho','enviado','aprovado','recusado','expirado');
create type public.order_status as enum ('rascunho','confirmado','cancelado');
create type public.op_status as enum ('nao_iniciado','parcial','concluido','nao_aplicavel');
create type public.issue_status as enum ('aberta','em_revisao','resolvida','ignorada');

-- ============ CORE ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Ki Delícia Gestão',
  legal_name text,
  trade_name text,
  document text,
  address jsonb not null default '{}'::jsonb,
  phone text,
  email text,
  logo_url text,
  timezone text not null default 'America/Manaus',
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status public.member_status not null default 'pendente',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id, role)
);

-- ============ HELPERS ============
create or replace function public.is_org_member(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organization_members m
    where m.organization_id = _org and m.user_id = auth.uid() and m.status = 'ativo');
$$;

create or replace function public.has_role(_org uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles r
    join public.organization_members m
      on m.organization_id = r.organization_id and m.user_id = r.user_id and m.status = 'ativo'
    where r.organization_id = _org and r.user_id = auth.uid() and r.role = _role);
$$;

create or replace function public.has_any_role(_org uuid, _roles public.app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles r
    join public.organization_members m
      on m.organization_id = r.organization_id and m.user_id = r.user_id and m.status = 'ativo'
    where r.organization_id = _org and r.user_id = auth.uid() and r.role = any(_roles));
$$;

create or replace function public.can_write_commercial(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_role(_org, array['administrador','gestor','comercial']::public.app_role[]);
$$;

create or replace function public.can_admin(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_role(_org, array['administrador','gestor']::public.app_role[]);
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- bootstrap: cria organização e torna o criador administrador
create or replace function public.create_organization(_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare _org uuid; _uid uuid := auth.uid();
begin
  if _uid is null then raise exception 'Autenticação obrigatória'; end if;
  if exists (select 1 from public.organization_members where user_id = _uid) then
    raise exception 'Usuário já vinculado a uma organização';
  end if;
  insert into public.organizations (name, trade_name) values (coalesce(nullif(trim(_name),''),'Ki Delícia Gestão'), 'Ki Delícia')
  returning id into _org;
  insert into public.organization_members (organization_id, user_id, status) values (_org, _uid, 'ativo');
  insert into public.user_roles (organization_id, user_id, role) values (_org, _uid, 'administrador');
  return _org;
end; $$;

-- solicitação de acesso a uma organização existente
create or replace function public.request_access(_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória'; end if;
  insert into public.organization_members (organization_id, user_id, status)
  values (_org, auth.uid(), 'pendente')
  on conflict (organization_id, user_id) do nothing;
end; $$;

-- ============ CADASTROS ============
create table public.issuers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_name text not null,
  trade_name text,
  document text,
  state_registration text,
  address jsonb not null default '{}'::jsonb,
  phone text,
  email text,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table public.salespeople (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  kind text not null default 'vendedor', -- vendedor | canal | interno_fabrica | nao_classificado
  user_id uuid references auth.users(id) on delete set null,
  aliases text[] not null default '{}',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table public.sales_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.price_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  kind text not null default 'geral', -- geral | cliente | canal
  valid_from date,
  valid_to date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  legal_name text not null,
  trade_name text,
  document text,
  document_normalized text generated always as (regexp_replace(coalesce(document,''), '[^0-9]', '', 'g')) stored,
  state_registration text,
  email text,
  phone text,
  address jsonb not null default '{}'::jsonb,
  commercial_group text,
  salesperson_id uuid references public.salespeople(id) on delete set null,
  payment_terms text,
  price_list_id uuid references public.price_lists(id) on delete set null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.customer_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  name text not null,
  document text,
  state_registration text,
  address jsonb not null default '{}'::jsonb,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sku text not null,
  legacy_code text,
  description text not null,
  raw_description text,
  brand text default 'Ki Delícia',
  category text,
  flavor text,
  presentation_raw text,
  base_unit text not null default 'UN',
  net_weight numeric(12,3),
  weight_unit text,
  commercial_unit text not null default 'UN',
  units_per_package numeric(12,4) not null default 1,
  divisible boolean not null default false,
  ean text,
  ncm text,
  kind public.product_kind not null default 'fabricado',
  track_lot boolean not null default false,
  min_stock numeric(14,4) not null default 0,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  unique (organization_id, sku)
);
create index on public.products (organization_id, legacy_code);
create index on public.products (organization_id, ean);

create table public.product_presentations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  commercial_unit text not null default 'FARDO',
  factor_to_base numeric(12,4) not null check (factor_to_base > 0),
  divisible boolean not null default false,
  ean text,
  raw_text text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.price_list_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  price_list_id uuid not null references public.price_lists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  presentation_id uuid references public.product_presentations(id) on delete set null,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  price_unit text not null default 'UN',
  created_at timestamptz not null default now(),
  unique (price_list_id, product_id, presentation_id)
);

alter table public.customers add constraint customers_price_list_org_fk
  foreign key (price_list_id) references public.price_lists(id) on delete set null;

-- ============ NUMERAÇÃO ============
create table public.doc_counters (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  doc_type text not null,
  last_number bigint not null default 0,
  primary key (organization_id, doc_type)
);

create or replace function public.next_doc_number(_org uuid, _type text)
returns bigint language plpgsql security definer set search_path = public as $$
declare _n bigint;
begin
  insert into public.doc_counters (organization_id, doc_type, last_number)
  values (_org, _type, 1)
  on conflict (organization_id, doc_type)
  do update set last_number = public.doc_counters.last_number + 1
  returning last_number into _n;
  return _n;
end; $$;

-- ============ PRÉ-VENDAS ============
create table public.presales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number bigint not null,
  customer_id uuid references public.customers(id) on delete set null,
  prospect_name text,
  location_id uuid references public.customer_locations(id) on delete set null,
  salesperson_id uuid references public.salespeople(id) on delete set null,
  date date not null default current_date,
  origin text,
  next_action text,
  expected_delivery date,
  status public.presale_status not null default 'rascunho',
  loss_reason text,
  notes text,
  total numeric(14,2) not null default 0,
  duplicated_from uuid references public.presales(id) on delete set null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);

create table public.presale_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  presale_id uuid not null references public.presales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  presentation_id uuid references public.product_presentations(id),
  description_snapshot text not null default '',
  commercial_unit text not null default 'UN',
  qty_commercial numeric(14,4) not null check (qty_commercial > 0),
  factor_to_base numeric(12,4) not null default 1 check (factor_to_base > 0),
  qty_base numeric(16,4) not null,
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  subtotal numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table public.followups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  presale_id uuid not null references public.presales(id) on delete cascade,
  happened_at timestamptz not null default now(),
  channel text,
  notes text not null,
  created_by uuid not null default auth.uid()
);

-- ============ ORÇAMENTOS ============
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number bigint not null,
  revision int not null default 1,
  presale_id uuid references public.presales(id) on delete set null,
  customer_id uuid not null references public.customers(id),
  location_id uuid references public.customer_locations(id) on delete set null,
  salesperson_id uuid references public.salespeople(id) on delete set null,
  issuer_id uuid references public.issuers(id) on delete set null,
  date date not null default current_date,
  valid_until date,
  status public.quote_status not null default 'rascunho',
  sent_at timestamptz,
  approved_at timestamptz,
  refused_reason text,
  payment_terms text,
  delivery_terms text,
  delivery_days int,
  discount numeric(14,2) not null default 0 check (discount >= 0),
  freight numeric(14,2) not null default 0 check (freight >= 0),
  additions numeric(14,2) not null default 0 check (additions >= 0),
  items_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text,
  version int not null default 1,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  product_id uuid not null references public.products(id),
  presentation_id uuid references public.product_presentations(id),
  description_snapshot text not null default '',
  commercial_unit text not null default 'UN',
  qty_commercial numeric(14,4) not null check (qty_commercial > 0),
  factor_to_base numeric(12,4) not null default 1 check (factor_to_base > 0),
  qty_base numeric(16,4) not null,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  price_source text not null default 'manual',
  discount numeric(14,2) not null default 0 check (discount >= 0),
  subtotal numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  revision int not null,
  snapshot jsonb not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

-- ============ PEDIDOS ============
create table public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number bigint not null,
  quote_id uuid references public.quotes(id) on delete set null,
  presale_id uuid references public.presales(id) on delete set null,
  customer_id uuid not null references public.customers(id),
  location_id uuid references public.customer_locations(id) on delete set null,
  salesperson_id uuid references public.salespeople(id) on delete set null,
  issuer_id uuid references public.issuers(id) on delete set null,
  origin text not null default 'direto',
  legacy_sale_ref text,
  legacy_order_ref text,
  legacy_refs_conflict boolean not null default false,
  order_date date not null default current_date,
  delivery_date date,
  due_date date,
  status public.order_status not null default 'rascunho',
  production_status public.op_status not null default 'nao_iniciado',
  shipping_status public.op_status not null default 'nao_iniciado',
  financial_status text not null default 'nao_informado',
  payment_terms text,
  customer_snapshot jsonb not null default '{}'::jsonb,
  discount numeric(14,2) not null default 0 check (discount >= 0),
  freight numeric(14,2) not null default 0 check (freight >= 0),
  additions numeric(14,2) not null default 0 check (additions >= 0),
  items_total numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  version int not null default 1,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number)
);
create unique index sales_orders_quote_unique on public.sales_orders (quote_id) where quote_id is not null;

create table public.sales_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sales_order_id uuid not null references public.sales_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  presentation_id uuid references public.product_presentations(id),
  description_snapshot text not null default '',
  commercial_unit text not null default 'UN',
  qty_commercial numeric(14,4) not null check (qty_commercial > 0),
  factor_to_base numeric(12,4) not null default 1 check (factor_to_base > 0),
  qty_base numeric(16,4) not null,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  price_source text not null default 'manual',
  discount numeric(14,2) not null default 0 check (discount >= 0),
  subtotal numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- ============ PENDÊNCIAS E AUDITORIA ============
create table public.pending_issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null,
  severity text not null default 'media',
  entity text,
  entity_id uuid,
  title text not null,
  details text,
  source text,
  status public.issue_status not null default 'aberta',
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor uuid default auth.uid(),
  entity text not null,
  entity_id uuid,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  reason text,
  source text default 'app',
  created_at timestamptz not null default now()
);

-- ============ CÁLCULOS ============
create or replace function public.calc_item_row()
returns trigger language plpgsql set search_path = public as $$
begin
  new.qty_base := round(new.qty_commercial * new.factor_to_base, 4);
  if new.qty_base <> trunc(new.qty_base) then
    raise exception 'Fracionamento incompatível: % x fator % resulta em % unidades base', new.qty_commercial, new.factor_to_base, new.qty_base;
  end if;
  new.subtotal := round(new.qty_commercial * new.unit_price, 2) - round(coalesce(new.discount,0), 2);
  if new.subtotal < 0 then raise exception 'Desconto maior que o valor do item'; end if;
  return new;
end; $$;

create trigger trg_calc_presale_item before insert or update on public.presale_items
for each row execute function public.calc_item_row();
create trigger trg_calc_quote_item before insert or update on public.quote_items
for each row execute function public.calc_item_row();
create trigger trg_calc_order_item before insert or update on public.sales_order_items
for each row execute function public.calc_item_row();

create or replace function public.recalc_parent_totals()
returns trigger language plpgsql set search_path = public as $$
declare _id uuid; _sum numeric(14,2);
begin
  if tg_table_name = 'presale_items' then
    _id := coalesce(new.presale_id, old.presale_id);
    select coalesce(sum(subtotal),0) into _sum from public.presale_items where presale_id = _id;
    update public.presales set total = _sum, updated_at = now() where id = _id;
  elsif tg_table_name = 'quote_items' then
    _id := coalesce(new.quote_id, old.quote_id);
    select coalesce(sum(subtotal),0) into _sum from public.quote_items where quote_id = _id;
    update public.quotes set items_total = _sum,
      total = round(_sum - discount + freight + additions, 2), updated_at = now() where id = _id;
  else
    _id := coalesce(new.sales_order_id, old.sales_order_id);
    select coalesce(sum(subtotal),0) into _sum from public.sales_order_items where sales_order_id = _id;
    update public.sales_orders set items_total = _sum,
      total = round(_sum - discount + freight + additions, 2), updated_at = now() where id = _id;
  end if;
  return null;
end; $$;

create trigger trg_tot_presale after insert or update or delete on public.presale_items
for each row execute function public.recalc_parent_totals();
create trigger trg_tot_quote after insert or update or delete on public.quote_items
for each row execute function public.recalc_parent_totals();
create trigger trg_tot_order after insert or update or delete on public.sales_order_items
for each row execute function public.recalc_parent_totals();

create or replace function public.recalc_header_totals()
returns trigger language plpgsql set search_path = public as $$
begin
  new.total := round(coalesce(new.items_total,0) - coalesce(new.discount,0) + coalesce(new.freight,0) + coalesce(new.additions,0), 2);
  new.updated_at := now();
  return new;
end; $$;
create trigger trg_hdr_quote before insert or update on public.quotes
for each row execute function public.recalc_header_totals();
create trigger trg_hdr_order before insert or update on public.sales_orders
for each row execute function public.recalc_header_totals();

-- congelar itens de pedido confirmado
create or replace function public.guard_frozen_order_items()
returns trigger language plpgsql set search_path = public as $$
declare _st public.order_status;
begin
  select status into _st from public.sales_orders where id = coalesce(new.sales_order_id, old.sales_order_id);
  if _st in ('confirmado','cancelado') then
    raise exception 'Itens de pedido % não podem ser alterados. Use revisão controlada.', _st;
  end if;
  return coalesce(new, old);
end; $$;
create trigger trg_freeze_order_items before insert or update or delete on public.sales_order_items
for each row execute function public.guard_frozen_order_items();

-- conversão idempotente de orçamento em pedido
create or replace function public.convert_quote_to_order(_quote_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare q public.quotes; _order_id uuid; _num bigint; _cust public.customers;
begin
  select * into q from public.quotes where id = _quote_id for update;
  if not found then raise exception 'Orçamento não encontrado'; end if;
  if not public.can_write_commercial(q.organization_id) then raise exception 'Sem permissão'; end if;
  if q.status <> 'aprovado' then raise exception 'Somente orçamento aprovado pode ser convertido'; end if;

  select id into _order_id from public.sales_orders where quote_id = _quote_id;
  if _order_id is not null then return _order_id; end if;

  select * into _cust from public.customers where id = q.customer_id;
  _num := public.next_doc_number(q.organization_id, 'pedido');

  insert into public.sales_orders (organization_id, number, quote_id, presale_id, customer_id, location_id,
    salesperson_id, issuer_id, origin, order_date, payment_terms, discount, freight, additions, notes,
    customer_snapshot, status)
  values (q.organization_id, _num, q.id, q.presale_id, q.customer_id, q.location_id,
    q.salesperson_id, q.issuer_id, 'orcamento', current_date, q.payment_terms, q.discount, q.freight, q.additions, q.notes,
    jsonb_build_object('legal_name', _cust.legal_name, 'trade_name', _cust.trade_name,
      'document', _cust.document, 'state_registration', _cust.state_registration,
      'address', _cust.address, 'payment_terms', coalesce(q.payment_terms, _cust.payment_terms)),
    'rascunho')
  returning id into _order_id;

  insert into public.sales_order_items (organization_id, sales_order_id, product_id, presentation_id,
    description_snapshot, commercial_unit, qty_commercial, factor_to_base, unit_price, price_source, discount, notes, qty_base)
  select q.organization_id, _order_id, i.product_id, i.presentation_id, i.description_snapshot, i.commercial_unit,
    i.qty_commercial, i.factor_to_base, i.unit_price, i.price_source, i.discount, i.notes, i.qty_base
  from public.quote_items i where i.quote_id = q.id;

  update public.quotes set status = 'aprovado', updated_at = now() where id = q.id;
  insert into public.audit_events (organization_id, entity, entity_id, action, reason, after_state)
  values (q.organization_id, 'sales_orders', _order_id, 'conversao_orcamento', 'Conversão de orçamento ' || q.number,
    jsonb_build_object('quote_id', q.id, 'order_number', _num));
  return _order_id;
end; $$;

-- ============ GRANTS ============
grant select, insert, update, delete on
  public.profiles, public.organizations, public.organization_members, public.user_roles,
  public.issuers, public.salespeople, public.sales_channels, public.customers, public.customer_locations,
  public.products, public.product_presentations, public.price_lists, public.price_list_items,
  public.presales, public.presale_items, public.followups,
  public.quotes, public.quote_items, public.quote_versions,
  public.sales_orders, public.sales_order_items,
  public.pending_issues, public.audit_events, public.doc_counters
to authenticated;
grant all on
  public.profiles, public.organizations, public.organization_members, public.user_roles,
  public.issuers, public.salespeople, public.sales_channels, public.customers, public.customer_locations,
  public.products, public.product_presentations, public.price_lists, public.price_list_items,
  public.presales, public.presale_items, public.followups,
  public.quotes, public.quote_items, public.quote_versions,
  public.sales_orders, public.sales_order_items,
  public.pending_issues, public.audit_events, public.doc_counters
to service_role;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.user_roles enable row level security;
alter table public.issuers enable row level security;
alter table public.salespeople enable row level security;
alter table public.sales_channels enable row level security;
alter table public.customers enable row level security;
alter table public.customer_locations enable row level security;
alter table public.products enable row level security;
alter table public.product_presentations enable row level security;
alter table public.price_lists enable row level security;
alter table public.price_list_items enable row level security;
alter table public.presales enable row level security;
alter table public.presale_items enable row level security;
alter table public.followups enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.quote_versions enable row level security;
alter table public.sales_orders enable row level security;
alter table public.sales_order_items enable row level security;
alter table public.pending_issues enable row level security;
alter table public.audit_events enable row level security;
alter table public.doc_counters enable row level security;

create policy "perfil proprio" on public.profiles for select to authenticated using (id = auth.uid());
create policy "atualiza perfil proprio" on public.profiles for update to authenticated using (id = auth.uid());

create policy "org visivel a membros" on public.organizations for select to authenticated
  using (public.is_org_member(id) or created_by = auth.uid());
create policy "org editavel por admin" on public.organizations for update to authenticated
  using (public.can_admin(id));

create policy "membros visiveis" on public.organization_members for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id));
create policy "admin gerencia membros" on public.organization_members for insert to authenticated
  with check (public.has_role(organization_id, 'administrador'));
create policy "admin altera membros" on public.organization_members for update to authenticated
  using (public.has_role(organization_id, 'administrador'));
create policy "admin remove membros" on public.organization_members for delete to authenticated
  using (public.has_role(organization_id, 'administrador'));

create policy "papeis visiveis" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_org_member(organization_id));
create policy "admin concede papeis" on public.user_roles for insert to authenticated
  with check (public.has_role(organization_id, 'administrador') and user_id <> auth.uid());
create policy "admin revoga papeis" on public.user_roles for delete to authenticated
  using (public.has_role(organization_id, 'administrador') and user_id <> auth.uid());

-- cadastros/comercial: leitura por membros, escrita por comercial+
do $$
declare t text;
begin
  foreach t in array array['issuers','salespeople','sales_channels','customers','customer_locations',
    'products','product_presentations','price_lists','price_list_items',
    'presales','presale_items','followups','quotes','quote_items','quote_versions',
    'sales_orders','sales_order_items','pending_issues']
  loop
    execute format('create policy "leitura membros" on public.%I for select to authenticated using (public.is_org_member(organization_id))', t);
    execute format('create policy "escrita comercial" on public.%I for insert to authenticated with check (public.can_write_commercial(organization_id))', t);
    execute format('create policy "alteracao comercial" on public.%I for update to authenticated using (public.can_write_commercial(organization_id))', t);
    execute format('create policy "exclusao gestor" on public.%I for delete to authenticated using (public.can_admin(organization_id))', t);
  end loop;
end $$;

create policy "auditoria leitura" on public.audit_events for select to authenticated
  using (public.can_admin(organization_id));
create policy "auditoria insercao" on public.audit_events for insert to authenticated
  with check (public.is_org_member(organization_id));
create policy "contadores leitura" on public.doc_counters for select to authenticated
  using (public.is_org_member(organization_id));
