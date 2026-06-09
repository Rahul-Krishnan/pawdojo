-- Additional skills and lessons for Pawdojo v0
-- Run after seed.sql

-- New skills
insert into public.skills (id, key, name, description, category, sort_order) values
  ('a1000000-0000-0000-0000-000000000007', 'drop_it', 'Drop It', 'Teach your dog to release items from their mouth.', 'manners', 7),
  ('a1000000-0000-0000-0000-000000000008', 'place', 'Place', 'Teach your dog to go to their bed or mat and settle.', 'manners', 8),
  ('a1000000-0000-0000-0000-000000000009', 'wait', 'Wait', 'Teach your dog to pause before going through doors or eating.', 'basics', 9),
  ('a1000000-0000-0000-0000-000000000010', 'gentle', 'Gentle', 'Teach your dog to take treats softly from your hand.', 'basics', 10)
on conflict (key) do nothing;

-- Additional lessons for existing skills + new skills
-- Continuing path_order from 20 onward

insert into public.lessons (id, skill_id, title, content_md, lesson_order, path_order, xp_reward) values

-- Drop It lessons
('b1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000007',
 'Drop It: The Trade Game',
 '## Teaching Drop It

**What you need:** Two identical toys, high-value treats.

### Steps

1. Give your dog a toy they like (but not their absolute favorite)
2. Show them a high-value treat near their nose
3. The moment they open their mouth to take the treat, say "Drop it"
4. As they release the toy, mark "Yes!" and give the treat
5. Then give the toy right back (this teaches them dropping doesn''t mean losing)

### Tips
- Always trade UP in value. The treat must be better than the toy
- Give the toy back most of the time. This prevents resource guarding
- Never chase your dog or pry their mouth open
- Practice with low-value items first, then work up to favorites',
 1, 20, 10),

('b1000000-0000-0000-0000-000000000021', 'a1000000-0000-0000-0000-000000000007',
 'Drop It: Adding the Cue',
 '## Fading the Lure

**Prerequisites:** Your dog readily drops items when shown a treat.

### Steps

1. Say "Drop it" BEFORE showing the treat
2. Wait 2 seconds for them to respond to the verbal cue alone
3. If they drop, jackpot! Multiple treats and praise
4. If they don''t drop after 2 seconds, show the treat as before
5. Gradually delay showing the treat longer (3, 5, 8 seconds)

### Tips
- The goal is the verbal cue alone triggers the drop
- Some dogs learn this in a day, others need a week. Both are normal
- Practice with different items: toys, sticks, socks, paper
- Never use "Drop it" in anger. Keep it positive',
 2, 21, 10),

('b1000000-0000-0000-0000-000000000022', 'a1000000-0000-0000-0000-000000000007',
 'Drop It: Real World Safety',
 '## Drop It for Safety

**Prerequisites:** Reliable drop on verbal cue indoors.

### Steps

1. Practice outdoors with supervised items (a stick, a ball)
2. Set up controlled scenarios: place a tissue on the floor, wait for grab, cue "Drop it"
3. On walks, carry high-value treats. When your dog picks something up, trade immediately
4. Practice with increasingly tempting items at home (food wrappers, socks)
5. The ultimate goal: your dog drops anything on cue, even food

### Tips
- This is a safety skill. Dogs eat dangerous things (chicken bones, medications, trash)
- If they have something truly dangerous, don''t panic. Calm approach + high-value trade
- If they swallow before you can cue, contact your vet. Don''t try to retrieve it
- "Drop it" and "Leave it" are complementary: Leave it = don''t touch; Drop it = release what''s in your mouth',
 3, 22, 10),

-- Place/Bed lessons
('b1000000-0000-0000-0000-000000000023', 'a1000000-0000-0000-0000-000000000008',
 'Place: Introduction to the Mat',
 '## Teaching Place

**What you need:** A mat, bed, or towel your dog can clearly see.

### Steps

1. Put the mat on the floor. When your dog steps on it, mark "Yes!" and treat
2. Toss a treat off the mat to reset them, then wait for them to return
3. Mark and treat every time they step onto the mat
4. After 5-6 reps, they should start going to the mat deliberately
5. Now only reward when they sit or lie down on the mat

### Tips
- Use a distinct mat, not their regular bed. This becomes a training tool
- A yoga mat or bath mat works well. Something portable you can take places
- Don''t lure them onto the mat. Let them figure it out (shaping)
- This skill is the foundation for calm behavior in any setting',
 1, 23, 10),

('b1000000-0000-0000-0000-000000000024', 'a1000000-0000-0000-0000-000000000008',
 'Place: Building Duration',
 '## Staying on the Mat

**Prerequisites:** Your dog goes to the mat and lies down.

### Steps

1. Send your dog to their mat. When they lie down, treat on the mat
2. Wait 3 seconds, treat again while they''re still on the mat
3. Gradually increase the gaps: 5s, 10s, 20s, 30s between treats
4. If they get up, just reset. No correction. Make it easier next time
5. Add a release word ("OK!" or "Free!") before they get up

### Tips
- Treat ON the mat, not from your hand. This reinforces the position
- Build duration slowly. Jumping from 10s to 60s will fail
- Practice during meals: dog on mat while you eat, treat periodically
- A Kong or chew toy on the mat helps extend duration naturally',
 2, 24, 10),

('b1000000-0000-0000-0000-000000000025', 'a1000000-0000-0000-0000-000000000008',
 'Place: Real World Applications',
 '## Place in Daily Life

**Prerequisites:** 2-minute mat stay at home.

### Steps

1. Bring the mat to a quiet cafe. Ask for "Place" while you order
2. Use "Place" when guests arrive: dog goes to mat instead of jumping
3. "Place" at the vet: calmer dog in the waiting room
4. "Place" during cooking: dog stays out of the kitchen on their mat
5. Travel with the mat: hotels, friends'' houses, parks

### Tips
- The mat becomes a portable calm zone. Your dog learns "this mat = chill"
- Start each new location with short, easy reps. Don''t expect 10 minutes day one
- High-value treats in new environments. The novelty competes for attention
- "Place" is the most underrated skill for living with a well-behaved dog',
 3, 25, 10),

-- Wait lessons
('b1000000-0000-0000-0000-000000000026', 'a1000000-0000-0000-0000-000000000009',
 'Wait: Door Manners',
 '## Teaching Wait at Doors

**What you need:** A door (interior door is easiest to start), treats.

### Steps

1. Approach a door with your dog on leash
2. Reach for the handle. If your dog moves forward, remove your hand
3. When they hold still, open the door a crack
4. If they rush, close the door (gently, not on them)
5. When they wait with the door open, say "OK!" and walk through together

### Tips
- The door opening is the reward. Patience gets them through
- Start with interior doors where the stakes are low
- For front doors, practice on leash for safety
- This prevents door bolting, one of the most dangerous behaviors',
 1, 26, 10),

('b1000000-0000-0000-0000-000000000027', 'a1000000-0000-0000-0000-000000000009',
 'Wait: Before Meals',
 '## Wait for Food

**Prerequisites:** Basic understanding of Wait at doors.

### Steps

1. Hold your dog''s food bowl at chest height. Say "Wait"
2. Slowly lower the bowl. If they move toward it, raise it back up
3. When they hold still while the bowl is on the floor, say "OK!" to release
4. Start with 2-second waits and build up
5. Goal: bowl on floor, you stand up, 5-second wait, then release

### Tips
- This builds incredible impulse control
- Don''t ask for more than 10 seconds at meals. The food is getting cold
- Some dogs learn faster if you use a hand signal (open palm)
- Mealtimes are free training opportunities. Use them daily',
 2, 27, 10),

('b1000000-0000-0000-0000-000000000028', 'a1000000-0000-0000-0000-000000000009',
 'Wait: Crossing Streets',
 '## Wait at Curbs

**Prerequisites:** Reliable Wait at doors and before meals.

### Steps

1. Approach a curb on leash. Stop walking
2. Say "Wait." Your dog should stop and stand or sit
3. Check for traffic. When safe, say "OK, let''s go!" and cross together
4. Treat on the other side
5. Practice at every curb on your walk (consistency is everything)

### Tips
- This is a life-saving skill. Dogs who bolt into streets get hit by cars
- Always wait at curbs, even on quiet streets. Build the habit for the one time it matters
- If your dog pulls toward the street, take a step back from the curb and try again
- Pair with "Look" or name to get eye contact before crossing',
 3, 28, 10),

-- Gentle lessons
('b1000000-0000-0000-0000-000000000029', 'a1000000-0000-0000-0000-000000000010',
 'Gentle: Soft Mouth',
 '## Teaching Gentle

**What you need:** Soft treats, patience.

### Steps

1. Hold a treat in your closed fist. Let your dog sniff and mouth at it
2. Wait. When they stop mouthing and use a lighter touch, say "Gentle" and open your hand
3. If they grab hard, close your fist again
4. Repeat until they approach your hand softly when you say "Gentle"
5. Progress to an open palm. Close if they snatch; let them take it if they''re soft

### Tips
- This is about mouth pressure, not speed
- Puppies especially need this. Their teeth are sharp and they don''t know their own strength
- Practice with kids'' hands in mind. If your dog will interact with children, gentle mouth is non-negotiable
- Some breeds (retrievers) naturally have soft mouths. Others (terriers) need more practice',
 1, 29, 10),

('b1000000-0000-0000-0000-000000000030', 'a1000000-0000-0000-0000-000000000010',
 'Gentle: Taking from Strangers',
 '## Gentle with Other People

**Prerequisites:** Reliable gentle with you.

### Steps

1. Have a friend hold a treat in their closed fist
2. Cue your dog "Gentle" before they approach
3. Your friend opens their hand only when the dog is soft
4. Practice with multiple people so the skill generalizes
5. Ask strangers who want to give treats to use the closed-fist method

### Tips
- Many dogs are softer with their owners than with strangers. This bridges the gap
- Brief your friends before practice: "Close your fist if they grab, open if they''re soft"
- This prevents the embarrassing moment of your dog biting someone''s fingers while taking a treat
- Kids can practice this too, with supervision. It teaches both the child and the dog boundaries',
 2, 30, 10),

-- More advanced lessons for existing skills

-- Sit: duration sit
('b1000000-0000-0000-0000-000000000031', 'a1000000-0000-0000-0000-000000000001',
 'Sit: Duration and Self-Control',
 '## Building a Long Sit

**Prerequisites:** Reliable sit in multiple locations.

### Steps

1. Ask for sit. Count silently to 5 before treating
2. Gradually increase: 10s, 15s, 30s, 1 minute
3. If they break, just reset. Never punish breaking a sit
4. Add mild distractions while they hold: wave your arms, step side to side
5. Practice "surprise sits": randomly ask for sit during walks and reward heavily

### Tips
- The surprise sit on walks is one of the most useful real-world behaviors
- It gets your dog''s attention and creates a calm moment before you decide what to do
- Long sits are great practice before crossing streets, entering stores, or greeting people
- If your dog can hold a 30-second sit in a busy environment, you have a well-trained dog',
 5, 31, 15),

-- Down: in motion
('b1000000-0000-0000-0000-000000000032', 'a1000000-0000-0000-0000-000000000002',
 'Down: Emergency Down at Distance',
 '## Teaching Down at a Distance

**Prerequisites:** Reliable down next to you.

### Steps

1. Ask for down from 2 feet away instead of right next to your dog
2. Use a big hand signal (palm flat, sweeping toward floor)
3. Gradually increase distance: 5ft, 10ft, across the room
4. Practice in the yard on a long line: walk away, turn, cue "Down"
5. This becomes an emergency stop. It can save your dog''s life if they''re running toward danger

### Tips
- Distance downs are hard. Many dogs want to come to you first, then lie down
- If they come to you instead, go back to shorter distance
- The hand signal matters more than the verbal cue at distance. Make it dramatic
- Practice this weekly even after your dog knows it. It atrophies without maintenance',
 4, 32, 15),

-- Recall: long line
('b1000000-0000-0000-0000-000000000033', 'a1000000-0000-0000-0000-000000000004',
 'Come: Long Line Practice',
 '## Building Distance Recall

**Prerequisites:** Reliable recall in enclosed areas.

### Steps

1. Attach a 20-30 foot long line (not retractable) to your dog''s harness
2. Let them explore, then call "Come!" in a happy voice
3. If they come, massive celebration: treats, praise, play
4. If they don''t come, gently guide them to you using the line. Then treat anyway
5. Never yank the line. It''s a safety net, not a correction tool

### Tips
- Long lines are the bridge between indoor recall and off-leash recall
- Use a harness, not a collar. A collar correction at speed can injure the neck
- Practice in low-distraction areas first: quiet park, fenced field
- The line drags on the ground. You only pick it up if they''re heading toward danger
- End every recall with something fun. Coming to you should be the best thing that happens on the walk',
 4, 33, 15),

-- Loose leash: the U-turn
('b1000000-0000-0000-0000-000000000034', 'a1000000-0000-0000-0000-000000000005',
 'Leash Walking: The U-Turn Technique',
 '## U-Turn for Leash Reactivity

**Prerequisites:** Basic loose leash walking.

### Steps

1. When your dog fixates on something ahead (another dog, squirrel, person), do a U-turn
2. Say "This way!" cheerfully and turn 180 degrees
3. Walk briskly in the opposite direction
4. When your dog catches up and is at your side, treat heavily
5. You can circle back once they''re calm. The U-turn is a reset, not a retreat

### Tips
- This is the #1 management tool for reactive dogs on walks
- Don''t wait until your dog is lunging. U-turn when you see the trigger but your dog hasn''t reacted yet
- Timing matters: turn BEFORE the meltdown, not during it
- You''re not punishing your dog. You''re removing them from a situation they can''t handle yet
- As your dog improves, you''ll need fewer U-turns. That''s progress',
 4, 34, 15),

-- Leave it: impulse control game
('b1000000-0000-0000-0000-000000000035', 'a1000000-0000-0000-0000-000000000006',
 'Leave It: The Impulse Control Game',
 '## Building Master-Level Impulse Control

**Prerequisites:** Reliable leave it with food on the floor.

### Steps

1. Place a treat on the floor. Say "Leave it." Walk your dog past it on leash
2. Treat from your hand when they ignore the floor treat
3. Place treats in a line. Walk your dog through the "treat gauntlet"
4. Try with their dinner bowl: "Leave it" while you set it down, release to eat
5. Advanced: leave it with toys, other dogs'' food, food on coffee tables

### Tips
- This game builds the mental muscle of choosing YOU over temptation
- It transfers to everything: leave the cat alone, leave the baby''s toy, leave that dead bird
- The better you are at this, the more freedom your dog earns
- Dogs who can leave things reliably can eventually be trusted off-leash in more environments
- This is cumulative: every successful leave it makes the next one easier',
 4, 35, 15)

on conflict (id) do nothing;

-- Additional achievement definitions for new skills
insert into public.achievement_definitions (id, key, name, description, category, condition_type, condition_value, xp_reward, sort_order) values
  ('c1000000-0000-0000-0000-000000000014', 'sessions_25', 'Quarter Century', 'Log 25 training sessions', 'milestone', 'total_sessions', '{"threshold": 25}', 150, 14),
  ('c1000000-0000-0000-0000-000000000015', 'sessions_100', 'Century Club', 'Log 100 training sessions', 'milestone', 'total_sessions', '{"threshold": 100}', 500, 15),
  ('c1000000-0000-0000-0000-000000000016', 'xp_2500', 'XP Master', 'Earn 2500 XP', 'milestone', 'xp_total', '{"threshold": 2500}', 200, 16),
  ('c1000000-0000-0000-0000-000000000017', 'streak_14', 'Two Week Streak', 'Maintain a 14-day streak', 'streak', 'streak_days', '{"threshold": 14}', 200, 17),
  ('c1000000-0000-0000-0000-000000000018', 'skill_drop_complete', 'Drop It Pro', 'Complete all Drop It lessons', 'skill_mastery', 'skill_complete', '{"skill_key": "drop_it"}', 100, 18),
  ('c1000000-0000-0000-0000-000000000019', 'skill_place_complete', 'Place Expert', 'Complete all Place lessons', 'skill_mastery', 'skill_complete', '{"skill_key": "place"}', 100, 19),
  ('c1000000-0000-0000-0000-000000000020', 'all_skills_started', 'Explorer', 'Complete at least one lesson in every skill', 'milestone', 'custom', '{}', 150, 20)
on conflict (key) do nothing;
