-- Pawdojo v0 curriculum seed data
-- Re-apply with: supabase db reset

-- Skills (6 core obedience skills)
insert into public.skills (id, key, name, description, category, sort_order) values
  ('a1000000-0000-0000-0000-000000000001', 'sit', 'Sit', 'Teach your dog to sit on cue.', 'basics', 1),
  ('a1000000-0000-0000-0000-000000000002', 'down', 'Down', 'Teach your dog to lie down on cue.', 'basics', 2),
  ('a1000000-0000-0000-0000-000000000003', 'stay', 'Stay', 'Teach your dog to hold position until released.', 'basics', 3),
  ('a1000000-0000-0000-0000-000000000004', 'recall', 'Come (Recall)', 'Teach your dog to come when called.', 'basics', 4),
  ('a1000000-0000-0000-0000-000000000005', 'loose_leash', 'Loose Leash Walking', 'Walk without pulling on the leash.', 'manners', 5),
  ('a1000000-0000-0000-0000-000000000006', 'leave_it', 'Leave It', 'Teach your dog to ignore distractions.', 'manners', 6)
on conflict (key) do nothing;

-- Lessons (linear mixed path: sit-1, down-1, stay-1, sit-2, recall-1, leash-1, ...)
-- path_order determines the global sequence

insert into public.lessons (id, skill_id, title, content_md, lesson_order, path_order, xp_reward) values

-- Sit lessons
('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001',
 'Sit: Lure and Capture',
 '## How to Teach Sit

**What you need:** Small, soft treats your dog loves.

### Steps

1. Hold a treat close to your dog''s nose
2. Slowly move the treat upward and slightly back over their head
3. As their nose follows the treat up, their bottom will naturally lower
4. The moment their bottom touches the ground, say "Yes!" and give the treat
5. Repeat 5-8 times per session

### Tips
- Keep sessions short (3-5 minutes)
- Practice in a quiet, low-distraction area first
- If your dog jumps for the treat, you''re holding it too high
- Don''t push their bottom down, let them figure it out',
 1, 1, 10),

-- Down lesson 1
('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002',
 'Down: From Sit to Down',
 '## How to Teach Down

**What you need:** Treats, a non-slippery surface.

### Steps

1. Start with your dog in a sit position
2. Hold a treat at their nose, then slowly lower it straight down to the floor
3. As they follow the treat down, their elbows should touch the ground
4. The moment they''re fully down, say "Yes!" and give the treat
5. If they stand up instead, lure more slowly or try between your legs

### Tips
- Practice on carpet or a mat (dogs don''t like lying on slippery floors)
- If your dog won''t go all the way down, reward partial progress
- Some dogs find this easier from a stand than from a sit',
 1, 2, 10),

-- Stay lesson 1
('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003',
 'Stay: Building Duration',
 '## How to Teach Stay

**What you need:** Treats, patience.

### Steps

1. Ask your dog to sit
2. Say "Stay" with an open palm signal
3. Wait 2 seconds, then say "Yes!" and treat while they''re still sitting
4. Gradually increase the duration: 2s, 5s, 10s, 15s, 30s
5. Release with a clear word like "OK!" or "Free!"

### Tips
- Always release your dog before they break the stay
- If they break, don''t say "No." Just reset and try a shorter duration
- Build duration before distance (stay close to your dog at first)
- End on a success, even if it means going back to an easier step',
 1, 3, 10),

-- Sit lesson 2 (adding the cue word)
('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001',
 'Sit: Adding the Cue',
 '## Adding the Verbal Cue

**Prerequisites:** Your dog reliably follows the treat lure into a sit.

### Steps

1. Say "Sit" just before you start the lure motion
2. Lure as before, mark "Yes!" and treat
3. After 10-15 reps, try saying "Sit" with a smaller lure (just move your hand slightly)
4. If your dog sits on the word alone, jackpot! (give 3-4 treats)
5. Gradually fade the lure until the hand signal is just a small upward gesture

### Tips
- Say the cue word only once. Don''t repeat "Sit, sit, sit!"
- If they don''t respond to the word, go back to luring for a few more reps
- Practice in different rooms to help generalization',
 2, 4, 10),

-- Recall lesson 1
('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000004',
 'Come: The Name Game',
 '## Building Recall with the Name Game

**What you need:** High-value treats (cheese, chicken, hot dogs).

### Steps

1. Stand a few feet from your dog
2. Say their name in a happy voice
3. When they look at you, say "Yes!" and give a high-value treat
4. Wait for them to look away, then repeat
5. Gradually increase the distance

### Tips
- Use your dog''s name only for positive things (never to scold)
- Recall is the most important safety skill. Always make coming to you rewarding
- Never call your dog to you for something they won''t like (bath, nail trim)
- Practice this before "Come" so they learn that hearing their name means good things',
 1, 5, 10),

-- Loose leash lesson 1
('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000005',
 'Leash Walking: Be a Tree',
 '## The Tree Method for Leash Pulling

**What you need:** 6-foot leash, treats, patience.

### Steps

1. Start walking with your dog on leash
2. The moment the leash goes tight, stop completely. Become a tree.
3. Wait. Don''t pull back, don''t say anything. Just stop.
4. When your dog looks back at you or creates slack, say "Yes!" and treat
5. Resume walking. Repeat every time the leash goes tight.

### Tips
- This takes many sessions. Pulling is deeply habitual
- Front-clip harnesses reduce pulling force while you train
- Don''t yank the leash. The stop is passive, not punitive
- Reward your dog for walking near you, not just for stopping',
 1, 6, 10),

-- Leave it lesson 1
('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000006',
 'Leave It: The Trade Game',
 '## Teaching Leave It

**What you need:** Two types of treats (boring and amazing).

### Steps

1. Hold a boring treat in your closed fist. Let your dog sniff and paw at it.
2. Wait. The moment they pull back or look away, say "Yes!" and give the AMAZING treat from your other hand
3. Never give the item you asked them to leave. The reward comes from you.
4. Repeat until they stop trying to get the closed-fist treat
5. Progress to the treat on an open palm (cover quickly if they go for it)

### Tips
- "Leave it" means "ignore that thing and look at me instead"
- Always reward from a different source than what you asked them to leave
- Practice with increasing difficulty: closed fist, open palm, floor with foot cover, floor uncovered',
 1, 7, 10),

-- Sit lesson 3 (proofing)
('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001',
 'Sit: Proofing in New Places',
 '## Proofing Sit in Different Environments

**Prerequisites:** Your dog responds to "Sit" in your usual training spot.

### Steps

1. Practice sit in a different room of your house
2. Try in the backyard or a quiet outdoor area
3. Ask for sit before meals, before opening doors, before putting on the leash
4. Rate your dog''s success: if they nail it 8/10 times, try a harder location
5. If success drops below 5/10, go back to an easier environment

### Tips
- Dogs don''t generalize well. "Sit" in the kitchen is different from "Sit" at the park to them
- Each new location is like starting over at 50% difficulty
- Don''t get frustrated. This is normal canine learning',
 3, 8, 10),

-- Down lesson 2
('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000002',
 'Down: Adding Duration',
 '## Building Down-Stay Duration

**Prerequisites:** Your dog lies down on cue.

### Steps

1. Ask for down
2. Wait 2 seconds, then mark "Yes!" and treat while they''re still down
3. Gradually increase: 5s, 10s, 20s, 30s, 1 minute
4. If they get up, just reset. No correction needed
5. Add a release word: "OK!" means they can get up

### Tips
- Treat while they''re in position, not after they get up
- If they keep breaking, you''re increasing too fast
- A comfy mat or bed makes long downs more appealing
- Practice during calm moments (after walks, after meals)',
 2, 9, 10),

-- Stay lesson 2 (adding distance)
('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003',
 'Stay: Adding Distance',
 '## Adding Distance to Stay

**Prerequisites:** Your dog holds stay for 30 seconds with you standing next to them.

### Steps

1. Ask for sit-stay
2. Take one small step backward, then immediately step back and treat
3. Gradually increase to 2 steps, 3 steps, 5 steps
4. Always return to your dog to treat (don''t call them to you during stay practice)
5. Build up to being able to walk to the other side of the room

### Tips
- Increase distance OR duration, not both at once
- If they break, you went too far. Make it easier
- Practice in hallways where movement is predictable
- Return to your dog from different angles (not always head-on)',
 2, 10, 10),

-- Recall lesson 2
('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000004',
 'Come: The Recall Game',
 '## Building a Reliable Recall

**Prerequisites:** Your dog responds to their name (Name Game).

### Steps

1. Have a partner hold your dog gently by the collar
2. Walk 10 feet away, then call "Come!" in a happy voice
3. When released, your dog should run to you. Big party when they arrive!
4. Trade roles with your partner. Make it a game
5. Gradually increase distance: 10ft, 20ft, across the yard

### Tips
- Make yourself the most exciting thing in the environment
- Squat down and open your arms when calling
- Never punish a dog for coming to you, even if they took a long time
- Use a long line (20-30ft) outdoors for safety while building recall',
 2, 11, 10),

-- Loose leash lesson 2
('b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000005',
 'Leash Walking: Rewarding Position',
 '## Rewarding the Right Position

**Prerequisites:** Your dog understands the "be a tree" stop.

### Steps

1. Start walking. Treat your dog every 3-5 steps if the leash is loose
2. Gradually space out rewards: every 5 steps, then 10, then 15
3. When your dog walks next to you voluntarily, mark "Yes!" and treat
4. If they start to drift ahead, stop (tree method) before the leash goes tight
5. Turn and walk the other direction to keep them engaged

### Tips
- High-rate reward at first (lots of treats, very frequently)
- As they get it, gradually thin the rewards
- Walk at a pace that matches your dog''s natural speed
- Mix up your route to keep walks interesting',
 2, 12, 10),

-- Leave it lesson 2
('b1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000006',
 'Leave It: Real World Practice',
 '## Proofing Leave It in the Real World

**Prerequisites:** Your dog leaves treats on your open palm.

### Steps

1. Place a treat on the floor and cover with your foot. Ask "Leave it"
2. When they look at you instead, mark "Yes!" and treat from your hand
3. Uncover the floor treat. If they go for it, cover again
4. Practice with the treat uncovered on the floor
5. On walks, say "Leave it" when approaching interesting smells or litter

### Tips
- On walks, start with low-value distractions and work up
- Always have treats ready so the reward is immediate
- If they grab something before you can cue, trade for a treat (don''t chase)
- "Leave it" is preventive. "Drop it" is for things already in their mouth',
 2, 13, 10),

-- Sit lesson 4
('b1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000001',
 'Sit: Adding Distractions',
 '## Sit with Distractions

**Prerequisites:** Your dog sits reliably in 3+ locations.

### Steps

1. Practice sit with mild distractions (TV on, another person in the room)
2. Try with moderate distractions (toys visible, door opening sounds)
3. Practice outdoors in a fenced yard
4. Ask for sit before throwing a ball (sit gets the ball thrown)
5. Rate each session: at what distraction level can they succeed 8/10?

### Tips
- Always set up for success. If the distraction is too high, increase distance from it
- Use higher-value treats in higher-distraction environments
- Real-world sit: before crossing streets, before greeting people
- This is where sit becomes truly useful in daily life',
 4, 14, 10),

-- Down lesson 3
('b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000002',
 'Down: Proofing and Real Life',
 '## Using Down in Daily Life

**Prerequisites:** Your dog lies down on cue and holds for 30+ seconds.

### Steps

1. Ask for down during TV time (mat or bed near couch)
2. Practice down at a cafe or outdoor restaurant (bring a mat)
3. Ask for down-stay while you prepare their food (release to eat)
4. Try down in the car before exiting
5. Work toward a solid 5-minute down-stay at home

### Tips
- A "place" mat makes down clearer: down means go to your mat and lie down
- Always release before they choose to get up
- Down-stay is the foundation for calm behavior in public
- This skill takes weeks to solidify. Be patient',
 3, 15, 10),

-- Stay lesson 3
('b1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000003',
 'Stay: The Three D''s',
 '## Combining Duration, Distance, and Distraction

**Prerequisites:** 30-second stay, 10+ feet distance separately.

### Steps

1. Easy combo: medium duration (15s) + short distance (5ft) + no distraction
2. Add one D at a time. Longer duration with less distance. More distance with less duration
3. Add mild distraction: someone walking past, a toy on the floor
4. Work toward: 1-minute stay at 15 feet with mild distractions
5. Test: can you walk to another room and back while they hold stay?

### Tips
- When you increase one D, decrease the others
- "Three D''s" is the framework professional trainers use
- Stay is a safety skill: it prevents your dog from running into danger
- Always return to reward. Never call them out of a stay during practice',
 3, 16, 10),

-- Recall lesson 3
('b1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000004',
 'Come: Emergency Recall',
 '## Building an Emergency Recall

**Prerequisites:** Reliable recall indoors and in enclosed areas.

### Steps

1. Choose a special word ONLY for emergencies (not "Come," use something unique like "Here here!")
2. At home, say the word and immediately give a jackpot: 10+ treats, a whole piece of chicken
3. Practice 2-3x per week max (keep it special)
4. Never use this word for routine recall. Save it for true emergencies
5. Practice in gradually more distracting environments, always with jackpot reward

### Tips
- The emergency recall is your "glass break" for dangerous situations
- The reward must be extraordinary every single time
- Never use it and then do something the dog doesn''t like
- Practice on a long line outdoors until you trust the behavior',
 3, 17, 10),

-- Loose leash lesson 3
('b1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000005',
 'Leash Walking: Different Environments',
 '## Walking in Challenging Environments

**Prerequisites:** Loose leash on quiet streets.

### Steps

1. Practice in a slightly busier area (quiet neighborhood, low-traffic park)
2. When you see a trigger (another dog, squirrel), increase distance and ask for focus
3. Reward heavily for choosing to look at you instead of the trigger
4. Gradually decrease your distance to common triggers
5. Rate each walk: what percentage of the time was the leash loose?

### Tips
- Carry high-value treats on walks (not just kibble)
- If your dog is over threshold (lunging, barking), you''re too close. Move away
- Consider "sniff walks" where pulling rules are relaxed and your dog gets to explore
- Separate "training walks" (short, structured) from "fun walks" (longer, relaxed)',
 3, 18, 10),

-- Leave it lesson 3
('b1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000006',
 'Leave It: Advanced Scenarios',
 '## Advanced Leave It

**Prerequisites:** Reliable leave it with food on the floor.

### Steps

1. Drop food "accidentally" while walking past. Ask "Leave it"
2. Practice with non-food items: tissues, shoes, toys
3. On walks: leave it for approaching dogs, people, food scraps
4. Counter-surfing prevention: place food on low table edge, supervise, cue "Leave it"
5. The ultimate test: can your dog leave an open pizza box on the floor?

### Tips
- Real-world leave it is about impulse control, not obedience
- The reward for leaving something should always be better than the thing itself
- If your dog struggles with a specific category (eg other dogs), work that separately
- Combine leave it with recall: "Leave it... Come!" for double safety',
 3, 19, 10)

on conflict (id) do nothing;

-- Achievement definitions
insert into public.achievement_definitions (id, key, name, description, category, condition_type, condition_value, xp_reward, sort_order) values
  ('c1000000-0000-0000-0000-000000000001', 'first_lesson', 'First Steps', 'Complete your first lesson', 'milestone', 'total_completions', '{"threshold": 1}', 25, 1),
  ('c1000000-0000-0000-0000-000000000002', 'first_session', 'Real Training', 'Log your first training session', 'milestone', 'total_sessions', '{"threshold": 1}', 25, 2),
  ('c1000000-0000-0000-0000-000000000003', 'streak_3', 'On a Roll', 'Maintain a 3-day streak', 'streak', 'streak_days', '{"threshold": 3}', 50, 3),
  ('c1000000-0000-0000-0000-000000000004', 'streak_7', 'Week Warrior', 'Maintain a 7-day streak', 'streak', 'streak_days', '{"threshold": 7}', 100, 4),
  ('c1000000-0000-0000-0000-000000000005', 'streak_30', 'Monthly Master', 'Maintain a 30-day streak', 'streak', 'streak_days', '{"threshold": 30}', 500, 5),
  ('c1000000-0000-0000-0000-000000000006', 'sessions_10', 'Dedicated Trainer', 'Log 10 training sessions', 'milestone', 'total_sessions', '{"threshold": 10}', 100, 6),
  ('c1000000-0000-0000-0000-000000000007', 'sessions_50', 'Training Pro', 'Log 50 training sessions', 'milestone', 'total_sessions', '{"threshold": 50}', 250, 7),
  ('c1000000-0000-0000-0000-000000000008', 'xp_100', 'Getting Started', 'Earn 100 XP', 'milestone', 'xp_total', '{"threshold": 100}', 25, 8),
  ('c1000000-0000-0000-0000-000000000009', 'xp_500', 'Rising Star', 'Earn 500 XP', 'milestone', 'xp_total', '{"threshold": 500}', 50, 9),
  ('c1000000-0000-0000-0000-000000000010', 'xp_1000', 'XP Champion', 'Earn 1000 XP', 'milestone', 'xp_total', '{"threshold": 1000}', 100, 10),
  ('c1000000-0000-0000-0000-000000000011', 'skill_sit_complete', 'Sit Expert', 'Complete all Sit lessons', 'skill_mastery', 'skill_complete', '{"skill_key": "sit"}', 100, 11),
  ('c1000000-0000-0000-0000-000000000012', 'skill_all_basics', 'Basics Graduate', 'Complete all basic obedience skills', 'skill_mastery', 'all_basics_complete', '{}', 250, 12),
  ('c1000000-0000-0000-0000-000000000013', 'perfect_rating', 'Nailed It', 'Rate a training session 5/5', 'milestone', 'perfect_session', '{}', 50, 13)
on conflict (key) do nothing;
