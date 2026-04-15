Attomik CPG Design Rules
These rules are injected into every brand config generation.
Claude must follow all of them without exception.
1. SECTION BACKGROUND ALTERNATION
Every homepage must follow this alternation pattern to create visual rhythm:

Hero banner: color__bg-overlay-1 color__text — dark image overlay, text always light
Marquee ticker: color__bg-primary — brand primary color, always high contrast, no margin, spacing_top 0, spacing_bottom 0
Brand intro / text section: color__bg-body — clean white/light
Icon grid pillars: color__bg-body — same as above, no break in rhythm
Product grid: color__bg-body — light, product images carry the visual weight
Image-text story: color__bg-body — let the image do the work
Comparison table: color__bg-tertiary — subtle break, slightly different from body
Testimonial slider: color__bg-body — back to light, quotes should breathe
Testimonial grid: color__bg-body — consistent with slider above it
Newsletter / email capture: color__bg-primary — dark, high contrast, stands out as a clear CTA moment
FAQ accordion: color__bg-body — light, readable, enable_split always true
Secondary hero banner: color__bg-overlay-1 color__text — dark like the first hero, bookends the page
Product slider: color__bg-body — light, end of page collection

Never put two dark sections next to each other.
Never put more than 3 light sections in a row without a break.
The newsletter section must always be dark — it is the conversion moment.
2. BUTTON STYLE RULES
Buttons must follow these exact conventions — never deviate:

Primary CTA on dark background (hero, newsletter, dark sections): btn
Secondary CTA on dark background: btn btn--plain (text only, inherits light color)
Primary CTA on light background: btn
Secondary CTA on light background: btn btn--outline
Small inline content CTA (inside image-text blocks): btn--small btn--plain
Small outline CTA: btn--small btn--outline
Newsletter subscribe button: btn btn--neutral
Never use btn--secondary for primary actions
Never use more than 2 buttons in the same block
CTA labels must be 2-3 words maximum: "Shop Now", "Learn More", "Get Started", "Our Story", "See Results", "Subscribe", "Discover [Brand]"

3. LAYOUT RULES

enable_margin: true on all sections except marquee ticker and newsletter
enable_margin: false on marquee ticker (full bleed)
enable_margin: false on newsletter (full bleed)
enable_split: true on FAQ accordion always
enable_split_heading: true on FAQ accordion always
layout_x_alignment on hero: justify-center text-center for centered brands, justify-start text-left for editorial brands
layout_y_alignment on hero: items-end — content anchored to bottom of hero
layout_column_width on text sections: 80 — never full width, always contained
layout_row_desktop on product grid: 4 columns
layout_row_desktop on icon grid: 3 columns (for 3 pillars) or 4 (for 4 pillars)
layout_row_desktop on testimonial grid: 3 columns
card_width_desktop on product slider: 4
enable_gradient: true on hero banners always — improves text legibility
enable_header_overlap: false always
spacing_top on marquee: 0
spacing_bottom on marquee: 0
spacing_top on all other sections: 100
spacing_bottom on all other sections: 100
Exception: testimonial slider spacing_bottom: 0 when testimonial grid follows immediately after

4. TYPOGRAPHY RULES
Hero headline:

4-7 words maximum
No period at end
Bold claim or brand promise
Title case or all lowercase — never ALL CAPS
Must be unique to this brand — never generic ("Premium Quality", "The Best Product")
Examples of good headlines: "Everything Happens Over Coffee", "Fuel Without the Crash", "Skin Built for Movement"

Hero subheadline:

1-2 sentences maximum
Benefit-driven, conversational tone
Expand on the headline, never repeat it
End with a period
20-30 words maximum

Section headings (text_intro, pillars heading, comparison heading etc):

3-6 words
Title case
No period
Should feel editorial not corporate

Body copy blocks:

2-3 sentences maximum per block
Short paragraphs — never a wall of text
No jargon, no passive voice
Write like a smart human, not a marketer

Marquee ticker items:

2-4 words each
Noun phrases — no verbs ("Pure Water Brewing" not "We Brew With Pure Water")
Mix ingredient claims, certifications, and lifestyle claims
Use ✦ as divider between items
4-6 items minimum, 8 maximum
Examples: "Single-Origin Beans", "Small-Batch Roasted", "Third-Party Tested", "Organic Certified", "No Artificial Flavors"

Pillar headlines:

2-3 words
Noun-based ("Pure Water Foundation", "Artisan Roasting", "Single-Origin Excellence")
Never start with a verb

Pillar descriptions:

1-2 sentences maximum
One specific benefit per pillar
No overlap between pillars — each must cover a distinct value proposition

Review copy:

1-3 sentences
First-person, specific, authentic
Must mention a specific product, result, feeling, or occasion
Never generic ("Great product! Love it! Highly recommend!")
Include real-feeling names with job title or descriptor
Examples: "Marcus T., Strategy Director" / "Elena R., Yoga Instructor" / "David K., Entrepreneur"

FAQ questions:

Start with: What, How, Is, Do, Can, Are, Why
Address real objections and curiosities — not softballs
First question must address the biggest objection to buying
Questions should cover: product differentiator, ingredients/sourcing, how to use, shipping/returns, subscription

FAQ answers:

2-4 sentences
Direct, honest, no corporate speak
Answer the question fully in the first sentence
Add context or nuance in following sentences

Newsletter heading:

Action-oriented: "Join the [Brand] Community", "Never Run Out", "Get [X]% Off Your First Order"
Must include a specific offer or benefit — never just "Sign Up for Updates"

Newsletter body:

1-2 sentences describing what subscribers get
Specific not vague: "early access to limited drops, brewing tips, member pricing" not "updates and news"

5. CPG CATEGORY-SPECIFIC RULES
Beverage (alcoholic-free, functional, RTD, coffee, tea):

Lead with occasion and feeling — not ingredients
Hero: evoke the moment of drinking ("Everything Happens Over Coffee", "The Lift Without the Crash")
Ticker: key functional ingredients + certifications + lifestyle positioning
Pillars: Taste/Flavor + Effect/Benefit + Quality/Sourcing
Story section: founder moment, why this drink needed to exist
Comparison table: highlight no alcohol, no sugar, no artificial ingredients, certifications competitor lacks
Reviews: mention specific flavor, physical feeling, occasion ("my morning routine", "after the gym", "at dinner parties")
FAQ: legality (if applicable), ingredients, how to drink/serve, shipping states, subscription options

Skincare (topical, wellness, sport, clean beauty):

Lead with transformation and result — not ingredients
Hero: the before/after moment ("Skin That Keeps Up", "Post-Workout Skin That Works As Hard As You Do")
Ticker: key active ingredients + skin type claims + certifications
Pillars: Key Ingredient Benefit + Skin Type Suitability + Texture/Experience
Story section: problem the founder experienced, gap in the market
Comparison table: highlight formulation differences, what competitors put in their products vs what you don't
Reviews: mention specific skin concern, result timeframe, skin type ("my acne cleared in 2 weeks", "finally something for sensitive skin")
FAQ: ingredients/actives, skin types, routine placement (AM vs PM), cruelty-free/vegan, returns

Food (condiments, pantry, snacks, meal kits, cooking ingredients):

Lead with taste and occasion
Hero: the meal moment, the flavor experience
Ticker: origin + key ingredients + certifications + cooking uses
Pillars: Flavor/Taste + Origin/Sourcing + Convenience/Versatility
Story section: family recipe, cultural origin, tradition
Comparison table: real ingredients vs artificial, origin vs generic, traditional method vs industrial
Reviews: mention specific dish, occasion, taste comparison ("replaced my go-to hot sauce", "perfect for taco night")
FAQ: ingredients/allergens, serving suggestions, shelf life, where to buy, recipes

Supplement (vitamins, protein, adaptogens, nootropics):

Lead with outcome and lifestyle benefit
Hero: the transformed state ("Think Clearer. Move Better. Recover Faster.")
Ticker: key ingredients + clinical backing + certifications + outcomes
Pillars: Key Ingredient + Efficacy/Mechanism + Lifestyle Fit
Story section: athlete or founder experience, performance gap, the research
Comparison table: ingredient quality, dosage transparency, what competitors hide
Reviews: mention specific result, timeframe, lifestyle context ("after 3 weeks my focus improved", "takes it before every workout")
FAQ: ingredients and dosages, how long to see results, safety/interactions, third-party testing, subscription

6. TONE RULES PER BRAND VIBE
Premium:

Restrained and confident
Short sentences carry more weight than long ones
No exclamation marks ever
Editorial language: "crafted", "sourced", "considered", "refined"
Never hype, never urgency tactics

Playful:

Conversational, warm, approachable
Light humor is welcome but never forced
Short sentences, casual vocabulary
Exclamation marks used sparingly and only where genuine
Brand personality should feel like a friend not a brand

Clinical:

Precise language, evidence-adjacent
Use specific numbers and measurements where possible
Measured claims — "supports", "helps", "promotes" not "cures", "fixes", "eliminates"
No lifestyle fluff — every sentence earns its place

Earthy:

Warm, natural, sensory language
Descriptions of texture, smell, taste, feeling
Connection to nature, origin, tradition
Avoid tech or clinical language

Bold:

Direct, strong verbs, punchy
Short sentences — 5-8 words preferred
Challenge the category conventions
No hedging, no qualifiers

Minimal:

Fewer words is always better
If it can be said in 3 words, don't use 6
White space is a design choice — don't fill it with copy
Every word must earn its place

Luxe:

Aspirational and sensory
Evocative language that creates desire
Never pushy or salesy
Write like the brand assumes you already know its value

Raw:

Honest and unpolished
Founder voice — first person where appropriate
Imperfect is authentic
Avoid corporate language entirely

7. WHAT TO NEVER DO
Copy:

Never use em dashes (—) anywhere in copy
Never write more than 3 sentences in any single content block
Never use these words: innovative, revolutionary, game-changing, cutting-edge, disruptive, pioneering, best-in-class, world-class, next-level, elevate (unless it fits naturally), seamless, ecosystem, leverage, synergy, holistic (unless it genuinely fits)
Never use passive voice in headlines ("Crafted For You" is passive — "We Craft For You" or "Built For You" is better)
Never repeat the same adjective twice on the same page
Never write generic reviews ("Great product!", "Love this!", "Highly recommend!", "5 stars!")
Never use exclamation marks in Premium, Luxe, or Minimal brands
Never let a section heading and its body copy say the same thing — heading sets the idea, body expands it
Never start two consecutive headlines with the same word
Never use "we are" or "we have" in headlines — use strong nouns or commands instead

Design:

Never put two dark sections adjacent to each other
Never use full-width text without layout_column_width set to 70-85
Never omit the marquee ticker — it is mandatory on every CPG store
Never skip the comparison table for beverage or skincare brands — it is a key trust builder
Never use more than 4 pillars for minimal or premium brands
Never use placeholder copy ("Lorem ipsum", "Your headline here", "Coming soon") — generate real copy always
Never leave newsletter offer vague — always specify the exact benefit
Never generate image values — always set to null (client uploads images)
Never generate URL values — always set to empty string (client fills in)
