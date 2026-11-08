/*
 * ADHD Flow Widget — Task Breakdown Module
 * Copyright © 2026 jmenichole (J Chapman). All rights reserved.
 * Author: jmenichole <j.chapman7@yahoo.com>
 * GitHub: https://github.com/jmenichole
 * 
 * Unauthorized copying, distribution, or modification of this software is prohibited.
 * This software is proprietary and confidential.
 */

/* js/breakdown.js — Intelligent local heuristic task breakdown (Goblin.tools style) */
'use strict';

const TaskBreakdown = (() => {
    const TEMPLATES = [
        // ── PETS & ANIMALS (Specialized sub-cases first) ──
        {
            match: s => (s.includes('cat') || s.includes('kitten') || s.includes('kitty') || s.includes('dog') || s.includes('pet')) && 
                        (s.includes('inside') || s.includes('in') || s.includes('door') || s.includes('porch') || s.includes('bring') || s.includes('call')),
            steps: [
                { name: 'Grab a favorite treat bag or food bowl to shake', duration: 2 },
                { name: 'Step to the door or porch and gently call their names', duration: 3 },
                { name: 'Guide them inside and safely latch the door or screen', duration: 2 },
                { name: 'Top off fresh water bowl and reward them with a treat', duration: 3 }
            ]
        },
        {
            match: s => s.includes('litter') || s.includes('litterbox') || s.includes('litter box'),
            steps: [
                { name: 'Grab a small trash bag and the litter scoop', duration: 2 },
                { name: 'Scoop waste into bag and tie it tightly', duration: 4 },
                { name: 'Top off box with fresh clean litter if needed', duration: 2 },
                { name: 'Take bag to outdoor trash bin & wash hands', duration: 2 }
            ]
        },
        {
            match: s => (s.includes('dog') || s.includes('puppy') || s.includes('pup')) && (s.includes('walk') || s.includes('outside') || s.includes('park')),
            steps: [
                { name: 'Grab leash, waste bags, and keys', duration: 2 },
                { name: 'Attach leash/harness and step outside', duration: 2 },
                { name: 'Enjoy a low-pressure 15-minute sniff & walk', duration: 15 },
                { name: 'Unclip leash, wipe paws if needed, and refill water bowl', duration: 3 }
            ]
        },
        {
            match: s => (s.includes('feed') || s.includes('food')) && (s.includes('cat') || s.includes('dog') || s.includes('pet') || s.includes('fish') || s.includes('bird') || s.includes('puppy') || s.includes('kitten')),
            steps: [
                { name: 'Rinse out pet food and water bowls', duration: 2 },
                { name: 'Measure out fresh food into the bowl', duration: 2 },
                { name: 'Place bowl down and fill water bowl with cool water', duration: 2 }
            ]
        },
        {
            match: s => s.includes('cat') || s.includes('cats') || s.includes('dog') || s.includes('dogs') || s.includes('pet') || s.includes('pets') || s.includes('vet'),
            steps: [
                { name: 'Approach pet with calm energy or a favorite toy/brush', duration: 2 },
                { name: 'Complete primary pet care step (brushing, checkup, or play)', duration: 8 },
                { name: 'Give gentle affection, check water bowl, and wash hands', duration: 3 }
            ]
        },

        // ── PLANTS & GARDEN ──
        {
            match: s => s.includes('plant') || s.includes('plants') || s.includes('garden') || s.includes('water plant') || s.includes('lawn'),
            steps: [
                { name: 'Fill a watering can or cup with room-temperature water', duration: 2 },
                { name: 'Check soil with finger — water the pots that feel dry', duration: 5 },
                { name: 'Pinch off any dead yellow leaves and wipe leaves if dusty', duration: 3 }
            ]
        },

        // ── LAUNDRY & CLOTHES ──
        {
            match: s => s.includes('laundry') || s.includes('clothes') || s.includes('wash clothes') || s.includes('dryer') || s.includes('washer') || s.includes('fold'),
            steps: [
                { name: 'Gather clothes from floor or hamper into basket', duration: 3 },
                { name: 'Toss clothes into washer, add detergent, and press Start', duration: 3 },
                { name: 'Move washed load to dryer or drying rack', duration: 3 },
                { name: 'Fold or hang just 5 big items first (zero pressure to finish all)', duration: 5 },
                { name: 'Put remaining clean clothes in basket or drawers', duration: 3 }
            ]
        },

        // ── DISHES & KITCHEN ──
        {
            match: s => s.includes('dish') || s.includes('dishes') || s.includes('dishwasher') || s.includes('sink') || s.includes('pots') || s.includes('pans'),
            steps: [
                { name: 'Put on music or a podcast (makes sensory friction vanish)', duration: 2 },
                { name: 'Scrape scraps into trash & load plates/cups into dishwasher or rack', duration: 5 },
                { name: 'Wash or soak any greasy pans and silverware', duration: 5 },
                { name: 'Wipe down sink basin, dry hands, and breathe!', duration: 2 }
            ]
        },

        // ── TRASH & RECYCLING ──
        {
            match: s => s.includes('trash') || s.includes('garbage') || s.includes('recycle') || s.includes('recycling') || s.includes('bin') || s.includes('bins'),
            steps: [
                { name: 'Tie up the full bag from main kitchen trash', duration: 2 },
                { name: 'Quick lap through rooms to grab loose bathroom/desk wrappers', duration: 3 },
                { name: 'Take bags out to the outside bins or chute', duration: 3 },
                { name: 'Put a fresh liner into each trash can', duration: 2 }
            ]
        },

        // ── CLEANING & DECLUTTERING ──
        {
            match: s => s.includes('clean') || s.includes('tidy') || s.includes('declutter') || s.includes('room') || s.includes('house') || s.includes('vacuum') || s.includes('sweep') || s.includes('mop'),
            steps: [
                { name: 'Grab a trash bag and one "out of place" basket', duration: 2 },
                { name: 'Throw away obvious wrappers, cans, and paper', duration: 4 },
                { name: 'Put random items in basket to clear main surface (desk or table)', duration: 5 },
                { name: 'Wipe down main surface with a damp cloth or spray', duration: 4 },
                { name: 'Quick sweep or vacuum high-traffic walking area', duration: 5 }
            ]
        },

        // ── ERRANDS & GROCERIES ──
        {
            match: s => s.includes('grocery') || s.includes('groceries') || s.includes('store') || s.includes('target') || s.includes('walmart') || s.includes('pharmacy') || s.includes('errand') || s.includes('errands') || s.includes('post office') || s.includes('mail'),
            steps: [
                { name: 'Check fridge/pantry and jot 3-5 must-have items on phone', duration: 3 },
                { name: 'Grab keys, wallet, phone, and reusable bags', duration: 2 },
                { name: 'Head to the store and grab only the items on your list', duration: 20 },
                { name: 'Check out and return home', duration: 15 },
                { name: 'Put away cold/perishable items first (rest can wait)', duration: 5 }
            ]
        },

        // ── COOKING & MEALS ──
        {
            match: s => s.includes('cook') || s.includes('dinner') || s.includes('lunch') || s.includes('breakfast') || s.includes('meal') || s.includes('eat') || s.includes('food') || s.includes('snack') || s.includes('bake') || s.includes('sandwich'),
            steps: [
                { name: 'Drink a glass of water and decide on 1 easy meal', duration: 2 },
                { name: 'Take out 2-3 main ingredients and pan or plate', duration: 3 },
                { name: 'Quick prep: chop or unwrap ingredients', duration: 7 },
                { name: 'Cook or heat up food (set a timer so you do not wander)', duration: 10 },
                { name: 'Plate food and put away ingredients to enjoy your meal', duration: 5 }
            ]
        },

        // ── SHOWER & HYGIENE ──
        {
            match: s => s.includes('shower') || s.includes('bath') || s.includes('teeth') || s.includes('brush') || s.includes('wash face') || s.includes('shave') || s.includes('hygiene') || s.includes('skincare') || s.includes('hair'),
            steps: [
                { name: 'Grab a clean towel and comfortable clothes', duration: 2 },
                { name: 'Turn on warm water and step in immediately without overthinking', duration: 2 },
                { name: 'Quick wash body & hair (no extra pressure)', duration: 7 },
                { name: 'Dry off, put on clean clothes, and feel refreshed', duration: 4 }
            ]
        },

        // ── MEDS & HYDRATION ──
        {
            match: s => s.includes('med') || s.includes('meds') || s.includes('medicine') || s.includes('pill') || s.includes('pills') || s.includes('vitamin') || s.includes('vitamins') || s.includes('hydrate') || (s.includes('drink') && s.includes('water')),
            steps: [
                { name: 'Walk to where medication/vitamins are kept', duration: 1 },
                { name: 'Pour a tall glass of cool water', duration: 1 },
                { name: 'Take your dose with water', duration: 1 },
                { name: 'Drink the rest of the glass to stay hydrated', duration: 1 }
            ]
        },

        // ── PHONE CALLS & APPOINTMENTS ──
        {
            match: s => s.includes('call') || s.includes('phone') || s.includes('doctor') || s.includes('dentist') || s.includes('appointment') || s.includes('schedule') || s.includes('book') || s.includes('cancel') || s.includes('reserve'),
            steps: [
                { name: 'Find account/phone number and write 2 bullet points to say', duration: 3 },
                { name: 'Dial the number (deep breath — script ready)', duration: 2 },
                { name: 'Speak with representative or book appointment time', duration: 7 },
                { name: 'Note date/time on calendar immediately so you do not forget', duration: 2 }
            ]
        },

        // ── BILLS & ADMIN ──
        {
            match: s => s.includes('bill') || s.includes('bills') || s.includes('pay') || s.includes('tax') || s.includes('taxes') || s.includes('insurance') || s.includes('renew') || s.includes('subscription') || s.includes('bank'),
            steps: [
                { name: 'Open billing portal or envelope and confirm amount due', duration: 3 },
                { name: 'Confirm payment method and submit payment', duration: 2 },
                { name: 'Screenshot or note confirmation number', duration: 1 },
                { name: 'Close the tab with relief — task is handled!', duration: 1 }
            ]
        },

        // ── EMAILS & MESSAGES ──
        {
            match: s => s.includes('email') || s.includes('inbox') || s.includes('message') || s.includes('reply') || s.includes('respond') || s.includes('text') || s.includes('slack') || s.includes('dm'),
            steps: [
                { name: 'Open the message and read it once', duration: 2 },
                { name: 'Jot 2 bullet points of what you actually need to say', duration: 2 },
                { name: 'Draft a short 3-sentence reply without overthinking formality', duration: 5 },
                { name: 'Quick proofread for attachments and hit Send', duration: 2 }
            ]
        },

        // ── WORK, WRITING & STUDYING ──
        {
            match: s => s.includes('study') || s.includes('homework') || s.includes('assignment') || s.includes('read') || s.includes('paper') || s.includes('essay') || s.includes('report') || s.includes('write') || s.includes('article') || s.includes('chapter') || s.includes('research'),
            steps: [
                { name: 'Close distracting tabs and open your working document', duration: 3 },
                { name: 'Write a messy 3-part bullet-point outline', duration: 5 },
                { name: 'Draft section 1 without editing as you type', duration: 15 },
                { name: 'Take a 2-minute stretch break', duration: 2 },
                { name: 'Review draft and polish the main takeaways', duration: 10 }
            ]
        },

        // ── CODING & TECHNICAL WORK ──
        {
            match: s => s.includes('code') || s.includes('bug') || s.includes('fix') || s.includes('develop') || s.includes('app') || s.includes('script') || s.includes('program') || s.includes('git') || s.includes('pr') || s.includes('test'),
            steps: [
                { name: 'Write down expected behavior or reproduce bug in 1 sentence', duration: 3 },
                { name: 'Locate the specific file and function responsible', duration: 5 },
                { name: 'Write minimal fix or implement core feature slice', duration: 15 },
                { name: 'Run test or check browser to verify it works', duration: 5 },
                { name: 'Commit with a clear summary message', duration: 3 }
            ]
        },

        // ── EXERCISE & MOVEMENT ──
        {
            match: s => s.includes('workout') || s.includes('gym') || s.includes('run') || s.includes('stretch') || s.includes('exercise') || s.includes('yoga') || s.includes('lift'),
            steps: [
                { name: 'Change into workout clothes and shoes', duration: 3 },
                { name: 'Fill water bottle and put on high-energy music', duration: 2 },
                { name: '5 minutes of light warm-up or gentle walking', duration: 5 },
                { name: '15 minutes of main movement or exercise', duration: 15 },
                { name: 'Cool down stretch and drink fresh water', duration: 5 }
            ]
        },

        // ── BEDTIME & SLEEP ROUTINE ──
        {
            match: s => s.includes('bed') || s.includes('sleep') || s.includes('night') || s.includes('routine') || s.includes('wind down') || s.includes('rest'),
            steps: [
                { name: 'Dim overhead lights and plug phone to charge away from bed', duration: 3 },
                { name: 'Quick bathroom routine: wash face and brush teeth', duration: 5 },
                { name: 'Put on pajamas and get under the covers', duration: 2 },
                { name: 'Read a book or listen to calming audio for 10 minutes', duration: 10 }
            ]
        }
    ];

    function getLocalBreakdown(taskName, taskDuration = 25) {
        const lower = (taskName || '').toLowerCase().trim();

        // Check pattern templates
        for (let tmpl of TEMPLATES) {
            if (tmpl.match(lower)) {
                return JSON.parse(JSON.stringify(tmpl.steps));
            }
        }

        // Smart dynamic verb-based fallback
        if (lower.startsWith('bring ') || lower.startsWith('get ') || lower.startsWith('fetch ')) {
            const item = taskName.replace(/^(bring|get|fetch)\s+/i, '');
            return [
                { name: `Walk over to where ${item} is located`, duration: 2 },
                { name: `Gather or guide ${item}`, duration: 3 },
                { name: `Bring ${item} to its intended spot`, duration: 3 },
                { name: `Secure the area and check that you are all set`, duration: 2 }
            ];
        }

        if (lower.startsWith('put ') || lower.startsWith('put away ') || lower.startsWith('organize ')) {
            const item = taskName.replace(/^(put away|put|organize)\s+/i, '');
            return [
                { name: `Group ${item} into 1-2 small piles by where they go`, duration: 3 },
                { name: `Put the first pile where it belongs`, duration: 5 },
                { name: `Put the second pile away`, duration: 5 },
                { name: `Wipe the cleared surface and admire your space!`, duration: 2 }
            ];
        }

        if (lower.startsWith('find ') || lower.startsWith('look for ') || lower.startsWith('search ')) {
            const item = taskName.replace(/^(find|look for|search for|search)\s+/i, '');
            return [
                { name: `Check the spot you remember seeing ${item} last`, duration: 2 },
                { name: `Check the top 2 usual hiding places (bag, desk, counters)`, duration: 3 },
                { name: `Look under surfaces and between cushions`, duration: 4 },
                { name: `Once found, place ${item} in an obvious, safe spot`, duration: 1 }
            ];
        }

        if (lower.startsWith('check ') || lower.startsWith('inspect ') || lower.startsWith('verify ')) {
            const item = taskName.replace(/^(check|inspect|verify)\s+/i, '');
            return [
                { name: `Walk over or navigate to ${item}`, duration: 2 },
                { name: `Take a quick 2-minute visual check of the status`, duration: 2 },
                { name: `Handle any quick 3-minute adjustment needed`, duration: 3 },
                { name: `Check it off your list and move forward`, duration: 1 }
            ];
        }

        // High-empathy clinical ADHD unfreezer (Initiation -> 3-min starter -> Momentum -> Good Enough finish)
        return [
            { name: `Stand up or step over to where "${taskName}" happens — just reach the starting line`, duration: 2 },
            { name: `Do the absolute smallest 3-minute physical starter step for "${taskName}"`, duration: 3 },
            { name: `Keep going on the main part for just 10 minutes (zero perfectionism!)`, duration: 10 },
            { name: `Wrap up what you have done — remember: "good enough" is finished! 🎉`, duration: 3 }
        ];
    }

    return { getLocalBreakdown };
})();
