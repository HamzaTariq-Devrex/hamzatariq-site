-- Homepage concepts (owner, 2026-11-16): also return the WhatsApp tags, so the demo shows a
-- WhatsApp button only when OpenStreetMap lists one. Still public details only.
create or replace function public.app_ox_preview(p_secret text, p_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.check_secret(p_secret);
  return (select jsonb_build_object('name', p.name, 'business_type', p.business_type, 'city', p.city, 'country', p.country, 'phone', p.phone,
            'tags', (select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from jsonb_each_text(p.osm_tags)
                     where key in ('opening_hours', 'addr:housenumber', 'addr:street', 'addr:city', 'addr:postcode', 'addr:suburb', 'addr:state',
                                   'addr:unit', 'addr:place', 'craft', 'shop', 'amenity', 'tourism', 'cuisine', 'contact:whatsapp', 'whatsapp')),
            'created_at', v.created_at, 'expires_at', v.expires_at, 'expired', v.expires_at < now())
          from public.prospect_previews v join public.prospects p on p.id = v.prospect_id
          where v.id = p_id);
end;
$$;
