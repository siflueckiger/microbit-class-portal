-- Local development seed data. `supabase db reset` runs this automatically.
-- (Not applied to the hosted project unless run manually.)

with c as (
  insert into public.classes (name, code)
  values ('5a', 'DEMO5A')
  on conflict (code) do update set name = excluded.name
  returning id
),
t1 as (
  insert into public.tutorials (title, description, steps)
  values (
    'Flashing heart',
    'Make a heart flash on the LED display.',
    '[
      {"id":"fh1","title":"Step 1","description":"Drag a show icon block into on start and choose the heart icon.","code":"basic.showIcon(IconNames.Heart)","kind":"blocks","blockXml":""},
      {"id":"fh2","title":"Step 2","description":"Add a second show icon block and choose the small heart.","code":"basic.showIcon(IconNames.Heart)\nbasic.showIcon(IconNames.SmallHeart)","kind":"blocks","blockXml":""},
      {"id":"fh3","title":"Step 3","description":"Download your program to the micro:bit and watch the heart flash!","code":"","kind":"blocks","blockXml":""}
    ]'::jsonb
  )
  returning id
),
t2 as (
  insert into public.tutorials (title, description, steps)
  values (
    'Dice',
    'Shake the micro:bit to roll a random number.',
    '[
      {"id":"d1","title":"Step 1","description":"Add an on shake block.","code":"input.onGesture(Gesture.Shake, function () {\n})","kind":"blocks","blockXml":""},
      {"id":"d2","title":"Step 2","description":"Inside it, add show number with pick random.","code":"input.onGesture(Gesture.Shake, function () {\n    basic.showNumber(randint(1, 6))\n})","kind":"blocks","blockXml":""}
    ]'::jsonb
  )
  returning id
)
insert into public.class_tutorials (class_id, tutorial_id, position)
select c.id, x.id, x.pos
from c, (
  select id, 1 as pos from t1
  union all
  select id, 2 as pos from t2
) x
on conflict do nothing;
