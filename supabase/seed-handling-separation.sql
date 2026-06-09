-- Handling and Separation skills for Pawdojo
-- Safe to re-run: uses ON CONFLICT DO NOTHING

insert into public.skills (id, key, name, description, category, sort_order) values
  ('a1000000-0000-0000-0000-000000000014', 'handling', 'Handling', 'Teach your dog to stay calm during grooming and physical exams.', 'basics', 14),
  ('a1000000-0000-0000-0000-000000000015', 'separation', 'Separation', 'Teach your dog to stay calm when you step away.', 'manners', 15)
on conflict (key) do nothing;

insert into public.lessons (id, skill_id, title, content_md, lesson_order, path_order, xp_reward) values

-- Handling lesson 1
('b1000000-0000-0000-0000-000000000045', 'a1000000-0000-0000-0000-000000000014',
 'Handling: Touch and Reward',
 '## Getting Your Dog Comfortable with Touch

**What you need:** Soft treats, a calm environment.

### Steps

1. Gently touch your dog''s shoulder. Mark "Yes!" and treat
2. Work through different body parts: back, sides, chest
3. Touch each ear briefly. Mark and treat
4. Lift each paw for 1 second. Mark and treat
5. Run your hand down each leg. Mark and treat

### Tips
- Go at your dog''s pace. If they pull away, you went too fast
- Pair every touch with a treat so they build a positive association
- Short sessions (2-3 minutes) work better than long ones
- If your dog is sensitive about a specific area, start nearby and work toward it gradually
- This skill is essential for vet visits, grooming, and nail trims',
 1, 45, 10),

-- Handling lesson 2
('b1000000-0000-0000-0000-000000000046', 'a1000000-0000-0000-0000-000000000014',
 'Handling: Grooming Simulation',
 '## Simulating a Grooming Session

**Prerequisites:** Your dog is comfortable with brief touches on all body parts.

### Steps

1. Gently hold your dog''s paw for 3 seconds while feeding treats. Build to 10 seconds
2. Touch each toenail with your finger (no clipper yet). Treat each nail
3. Run a soft brush along their back for 5 seconds. Treat
4. Lift their lip to look at their teeth. Treat immediately
5. Look inside each ear (gently fold the flap). Treat

### Tips
- Introduce grooming tools gradually: show the brush, treat. Touch with brush, treat. One stroke, treat
- Nail clippers: let them sniff, treat. Touch to nail, treat. Clip one nail, jackpot. Stop there for day one
- If your dog freezes, licks lips, or yawns, those are stress signals. Slow down
- Practice these before your dog actually needs grooming, not during the grooming itself',
 2, 46, 10),

-- Handling lesson 3
('b1000000-0000-0000-0000-000000000047', 'a1000000-0000-0000-0000-000000000014',
 'Handling: Strangers and the Vet',
 '## Being Handled by Other People

**Prerequisites:** Comfortable with grooming simulation by you.

### Steps

1. Have a friend give your dog a treat, then gently touch their back. Treat again
2. Your friend picks up a front paw briefly. You treat from the other side
3. Your friend looks in an ear. You treat
4. Practice with 2-3 different people so the skill generalizes
5. At the vet: bring high-value treats and reward calm behavior during the exam

### Tips
- Always let your dog approach the person first, not the other way around
- Brief your friends: "Touch gently, I''ll handle the treats"
- Some dogs are fine with you but nervous with strangers. That''s normal and why this step matters
- Vet visits go dramatically better when your dog has practiced being handled by non-family members
- If your vet allows it, do "happy visits" where you just go in, get treats from staff, and leave',
 3, 47, 15),

-- Separation lesson 1
('b1000000-0000-0000-0000-000000000048', 'a1000000-0000-0000-0000-000000000015',
 'Separation: Tiny Departures',
 '## Teaching Your Dog You Always Come Back

**What you need:** Treats, a tether or baby gate.

### Steps

1. With your dog on a tether or behind a baby gate, step back 2 feet
2. Immediately step back and treat. You were gone for 1 second
3. Repeat 5 times, then increase to 3 seconds away
4. Build up: 5 seconds, 10 seconds, 20 seconds
5. Always return calmly. No big excited greetings (that makes departures feel bigger)

### Tips
- The key insight: your dog needs to learn that you leaving predicts you returning with something good
- If your dog whines when you step away, you went too far too fast. Go back to a shorter distance
- Keep your departures and returns boring. Calm energy teaches calm behavior
- Practice multiple short reps rather than one long absence
- This is prevention for separation anxiety, which is much harder to fix than to prevent',
 1, 48, 10),

-- Separation lesson 2
('b1000000-0000-0000-0000-000000000049', 'a1000000-0000-0000-0000-000000000015',
 'Separation: Out of Sight',
 '## Building Up to Out-of-Sight Departures

**Prerequisites:** Your dog stays calm for 30 seconds with you nearby.

### Steps

1. Step behind a door or around a corner for 2 seconds. Return and treat
2. Build up: 5 seconds, 15 seconds, 30 seconds out of sight
3. Vary the duration randomly (don''t always make it longer). 10s, 5s, 20s, 8s, 30s
4. Start closing the door briefly. Open immediately and treat
5. Build to 1 minute behind a closed door

### Tips
- Random intervals are important. If it always gets harder, your dog learns to worry as time increases
- A stuffed Kong or chew toy gives them something positive to do while you''re gone
- Listen for signs of distress (whining, barking, scratching). If these start, make it easier
- If your dog can handle 1 minute behind a closed door calmly, you''re in great shape
- Practice during calm parts of the day, not when your dog is already wound up',
 2, 49, 10),

-- Separation lesson 3
('b1000000-0000-0000-0000-000000000050', 'a1000000-0000-0000-0000-000000000015',
 'Separation: Extended Calm at Home',
 '## Building Longer Separations at Home

**Prerequisites:** Comfortable with 1-minute out-of-sight separations.

### Steps

1. Leave the room for 2 minutes. Return calmly, treat if your dog stayed relaxed
2. Build to 5 minutes, then 10, then 20
3. Vary what you do while away: go to another room, step outside briefly, move around the house
4. Add real-life cues: pick up your keys, put on shoes, then sit back down. Desensitize departure signals
5. Practice leaving through the front door for 30 seconds, then 2 minutes, then 5

### Tips
- The goal is a dog who barely notices you left because they know you always come back
- Departure cues (keys, shoes, coat) trigger anxiety in some dogs. Practice picking them up and NOT leaving dozens of times to break the association
- A stuffed Kong or long-lasting chew given right before you leave creates a positive association with your departure
- If your dog shows signs of true separation anxiety (destructive behavior, howling, house soiling), work with a veterinary behaviorist rather than pushing through alone
- Keep a calm energy when you leave and return. No dramatic goodbyes or excited reunions',
 3, 50, 15)

on conflict (id) do nothing;

-- Achievement definitions for new skills
insert into public.achievement_definitions (id, key, name, description, category, condition_type, condition_value, xp_reward, sort_order) values
  ('c1000000-0000-0000-0000-000000000025', 'skill_handling_complete', 'Handling Pro', 'Complete all Handling lessons', 'skill_mastery', 'skill_complete', '{"skill_key": "handling"}', 100, 25),
  ('c1000000-0000-0000-0000-000000000026', 'skill_separation_complete', 'Home Alone Hero', 'Complete all Separation lessons', 'skill_mastery', 'skill_complete', '{"skill_key": "separation"}', 100, 26)
on conflict (key) do nothing;
