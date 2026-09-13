from __future__ import annotations

import base64
import hashlib
import re
from dataclasses import dataclass
from html import escape
from pathlib import Path


@dataclass(frozen=True)
class AssetSubject:
    key: str
    title: str
    query: str
    tags: tuple[str, ...]


@dataclass(frozen=True)
class ReferencePhotoAsset:
    key: str
    title: str
    filename: str
    tags: tuple[str, ...]


CANONICAL_CATEGORIES = [
    "nature",
    "business",
    "food-drink",
    "technology",
    "fashion",
    "fitness",
    "travel",
    "abstract",
    "architecture",
    "animals",
    "people",
    "minimal",
    "education",
    "healthcare",
    "finance",
    "marketing",
    "social-media",
    "events",
    "sports",
    "music",
    "entertainment",
    "real-estate",
    "e-commerce",
    "startup",
    "office",
    "lifestyle",
    "beauty",
    "luxury",
    "automotive",
    "gaming",
    "science",
    "space",
    "environment",
    "agriculture",
    "festivals",
    "backgrounds",
    "textures",
    "patterns",
    "gradients",
    "illustrations",
    "icons",
    "stickers",
    "frames",
    "mockups",
    "product-images",
    "ui-elements",
    "infographics",
    "charts",
    "maps",
    "technical-diagrams",
]


REFERENCE_MEDIA_DIR = Path(__file__).resolve().parent / "media" / "asset-library"
REFERENCE_FULL_MEDIA_DIR = Path(__file__).resolve().parent / "media" / "asset-library-full"
REFERENCE_THUMBNAIL_MEDIA_DIR = Path(__file__).resolve().parent / "media" / "asset-library-thumbnails"


REFERENCE_PHOTO_SUBJECTS: dict[str, list[ReferencePhotoAsset]] = {
    "nature": [
        ReferencePhotoAsset("mountain-lake", "Mountain Lake Landscape", "01-mountain-lake.jpg", ("mountains", "lake", "landscape", "nature")),
        ReferencePhotoAsset("waterfall", "Forest Waterfall", "02-waterfall.jpg", ("waterfall", "forest", "river", "nature")),
        ReferencePhotoAsset("sunlit-forest", "Sunlit Forest Trail", "03-sunlit-forest.jpg", ("forest", "trees", "sunlight", "nature")),
        ReferencePhotoAsset("alpine-lake", "Alpine Lake Reflection", "04-alpine-lake.jpg", ("alpine", "lake", "mountains", "landscape")),
        ReferencePhotoAsset("ocean-sunset", "Ocean Sunset Horizon", "05-ocean-sunset.jpg", ("ocean", "sunset", "sky", "water")),
        ReferencePhotoAsset("lavender-field", "Lavender Field Sunset", "06-lavender-field.jpg", ("lavender", "flowers", "field", "sunset")),
        ReferencePhotoAsset("green-valley", "Green Mountain Valley", "07-green-valley.jpg", ("valley", "hills", "landscape", "green")),
        ReferencePhotoAsset("leaf-macro", "Fresh Leaf Macro", "08-leaf-macro.jpg", ("leaves", "macro", "green", "botanical")),
    ],
    "business": [
        ReferencePhotoAsset("meeting", "Executive Meeting Room", "01-meeting.jpg", ("meeting", "office", "team", "professionals")),
        ReferencePhotoAsset("handshake", "Business Handshake", "02-handshake.jpg", ("handshake", "agreement", "partnership", "business")),
        ReferencePhotoAsset("planning", "Business Planning Documents", "03-planning.jpg", ("planning", "charts", "documents", "strategy")),
        ReferencePhotoAsset("laptop-dashboard", "Laptop Analytics Workspace", "04-laptop-dashboard.jpg", ("laptop", "dashboard", "analytics", "workspace")),
        ReferencePhotoAsset("presentation", "Boardroom Presentation", "05-presentation.jpg", ("presentation", "speaker", "charts", "boardroom")),
        ReferencePhotoAsset("glass-buildings", "Corporate Glass Buildings", "06-glass-buildings.jpg", ("buildings", "corporate", "finance", "city")),
        ReferencePhotoAsset("clean-desk", "Clean Office Desk", "07-clean-desk.jpg", ("desk", "laptop", "notebook", "office")),
        ReferencePhotoAsset("team-table", "Team Strategy Meeting", "08-team-table.jpg", ("team", "meeting", "collaboration", "office")),
    ],
    "food-drink": [
        ReferencePhotoAsset("salad", "Fresh Garden Salad", "01-salad.jpg", ("salad", "fresh", "vegetables", "healthy")),
        ReferencePhotoAsset("burger", "Burger and Fries", "02-burger.jpg", ("burger", "fries", "restaurant", "meal")),
        ReferencePhotoAsset("latte", "Cafe Latte Cup", "03-latte.jpg", ("coffee", "latte", "cafe", "drink")),
        ReferencePhotoAsset("pasta", "Tomato Basil Pasta", "04-pasta.jpg", ("pasta", "italian", "tomato", "meal")),
        ReferencePhotoAsset("fruit-bowl", "Fresh Fruit Bowl", "05-fruit-bowl.jpg", ("fruit", "berries", "citrus", "healthy")),
        ReferencePhotoAsset("orange-juice", "Orange Juice Glass", "06-orange-juice.jpg", ("juice", "orange", "beverage", "drink")),
        ReferencePhotoAsset("cake", "Chocolate Cake Slice", "07-cake.jpg", ("cake", "dessert", "chocolate", "bakery")),
        ReferencePhotoAsset("vegetables", "Market Vegetables", "08-vegetables.jpg", ("vegetables", "ingredients", "fresh", "market")),
    ],
    "technology": [
        ReferencePhotoAsset("circuit", "Blue Circuit Board Macro", "01-circuit.jpg", ("circuit", "chip", "electronics", "technology")),
        ReferencePhotoAsset("code", "Programming Code Screen", "02-code.jpg", ("code", "developer", "software", "screen")),
        ReferencePhotoAsset("devices", "Laptop and Mobile Devices", "03-devices.jpg", ("laptop", "phone", "devices", "workspace")),
        ReferencePhotoAsset("ai-chip", "AI Chip Concept", "04-ai-chip.jpg", ("ai", "chip", "neural", "futuristic")),
        ReferencePhotoAsset("vr", "Virtual Reality Headset", "05-vr.jpg", ("vr", "headset", "immersive", "technology")),
        ReferencePhotoAsset("cloud", "Cloud Computing Concept", "06-cloud.jpg", ("cloud", "network", "digital", "infrastructure")),
        ReferencePhotoAsset("data-center", "Server Data Center", "07-data-center.jpg", ("server", "data-center", "cloud", "infrastructure")),
        ReferencePhotoAsset("robot-hand", "Robotic Hand Detail", "08-robot-hand.jpg", ("robot", "robotics", "automation", "engineering")),
    ],
    "fashion": [
        ReferencePhotoAsset("portrait", "Fashion Portrait With Hat", "01-portrait.jpg", ("model", "portrait", "hat", "style")),
        ReferencePhotoAsset("clothing-rack", "Boutique Clothing Rack", "02-clothing-rack.jpg", ("clothing", "rack", "boutique", "garments")),
        ReferencePhotoAsset("sneakers", "White Sneakers Product", "03-sneakers.jpg", ("shoes", "sneakers", "product", "style")),
        ReferencePhotoAsset("menswear", "Tailored Menswear Look", "04-menswear.jpg", ("menswear", "jacket", "outfit", "model")),
        ReferencePhotoAsset("sunglasses", "Sunglasses Fashion Portrait", "05-sunglasses.jpg", ("sunglasses", "portrait", "accessories", "style")),
        ReferencePhotoAsset("jewelry", "Gold Jewelry Flatlay", "06-jewelry.jpg", ("jewelry", "accessories", "gold", "flatlay")),
        ReferencePhotoAsset("handbag", "Luxury Handbag Outfit", "07-handbag.jpg", ("handbag", "luxury", "accessory", "fashion")),
        ReferencePhotoAsset("garments", "Neutral Garment Rack", "08-garments.jpg", ("garments", "clothing", "rack", "fashion")),
    ],
    "fitness": [
        ReferencePhotoAsset("gym", "Gym Strength Training", "01-gym.jpg", ("gym", "strength", "training", "fitness")),
        ReferencePhotoAsset("yoga", "Yoga Studio Practice", "02-yoga.jpg", ("yoga", "wellness", "stretch", "fitness")),
        ReferencePhotoAsset("pullup", "Pull-Up Workout", "03-pullup.jpg", ("pull-up", "strength", "training", "gym")),
        ReferencePhotoAsset("running", "Outdoor Running Sunset", "04-running.jpg", ("running", "cardio", "outdoor", "fitness")),
        ReferencePhotoAsset("dumbbells", "Dumbbells and Bottle", "05-dumbbells.jpg", ("dumbbells", "equipment", "gym", "training")),
        ReferencePhotoAsset("weights", "Dumbbell Shoulder Press", "06-weights.jpg", ("weights", "workout", "strength", "fitness")),
        ReferencePhotoAsset("cycling", "Road Cycling Athlete", "07-cycling.jpg", ("cycling", "bike", "road", "sport")),
        ReferencePhotoAsset("gear", "Workout Gear Flatlay", "08-gear.jpg", ("gear", "mat", "rope", "bottle")),
    ],
    "travel": [
        ReferencePhotoAsset("beach", "Tropical Beach Palm", "01-beach.jpg", ("beach", "tropical", "palm", "ocean")),
        ReferencePhotoAsset("airplane", "Airplane in Blue Sky", "02-airplane.jpg", ("airplane", "flight", "sky", "travel")),
        ReferencePhotoAsset("lake-pier", "Mountain Lake Pier", "03-lake-pier.jpg", ("lake", "mountains", "pier", "destination")),
        ReferencePhotoAsset("balloons", "Hot Air Balloons Valley", "04-balloons.jpg", ("balloons", "valley", "adventure", "travel")),
        ReferencePhotoAsset("island", "White Island Village", "05-island.jpg", ("island", "village", "sea", "vacation")),
        ReferencePhotoAsset("skyline", "Night City Skyline", "06-skyline.jpg", ("city", "skyline", "night", "destination")),
        ReferencePhotoAsset("roadtrip", "Camper Van Road Trip", "07-roadtrip.jpg", ("roadtrip", "camper", "van", "mountains")),
        ReferencePhotoAsset("canyon", "National Park Canyon", "08-canyon.jpg", ("canyon", "national-park", "landscape", "travel")),
    ],
    "abstract": [
        ReferencePhotoAsset("fluid-color", "Colorful Fluid Art", "01-fluid-color.jpg", ("fluid", "color", "paint", "abstract")),
        ReferencePhotoAsset("marble", "Dark Marble Texture", "02-marble.jpg", ("marble", "texture", "stone", "abstract")),
        ReferencePhotoAsset("paint-flow", "Vivid Paint Flow", "03-paint-flow.jpg", ("paint", "color", "flow", "abstract")),
        ReferencePhotoAsset("geometric", "Geometric Color Blocks", "04-geometric.jpg", ("geometric", "shapes", "blocks", "abstract")),
        ReferencePhotoAsset("blue-waves", "Blue Wave Texture", "05-blue-waves.jpg", ("waves", "texture", "blue", "abstract")),
        ReferencePhotoAsset("neon-lines", "Neon Light Lines", "06-neon-lines.jpg", ("neon", "lines", "dark", "futuristic")),
        ReferencePhotoAsset("pastel-marble", "Pastel Marble Pattern", "07-pastel-marble.jpg", ("pastel", "marble", "pattern", "abstract")),
        ReferencePhotoAsset("line-art", "Black White Line Art", "08-line-art.jpg", ("line-art", "black-white", "pattern", "abstract")),
    ],
    "architecture": [
        ReferencePhotoAsset("modern-house", "Modern House Exterior", "01-modern-house.jpg", ("house", "modern", "exterior", "architecture")),
        ReferencePhotoAsset("glass-building", "Glass Office Building", "02-glass-building.jpg", ("glass", "office", "building", "architecture")),
        ReferencePhotoAsset("living-room", "Minimal Living Interior", "03-living-room.jpg", ("interior", "living-room", "minimal", "architecture")),
        ReferencePhotoAsset("cityscape", "Urban City Skyline", "04-cityscape.jpg", ("city", "skyline", "buildings", "urban")),
        ReferencePhotoAsset("office-interior", "Modern Office Interior", "05-office-interior.jpg", ("office", "interior", "workplace", "modern")),
        ReferencePhotoAsset("bridge", "Steel Bridge Structure", "06-bridge.jpg", ("bridge", "structure", "engineering", "city")),
        ReferencePhotoAsset("museum", "Modern Museum Atrium", "07-museum.jpg", ("museum", "atrium", "modern", "public")),
        ReferencePhotoAsset("staircase", "Historic Stone Staircase", "08-staircase.jpg", ("historical", "stone", "staircase", "classic")),
    ],
    "animals": [
        ReferencePhotoAsset("dog", "Golden Dog Portrait", "01-dog.jpg", ("dog", "pet", "portrait", "animal")),
        ReferencePhotoAsset("lion", "Lion Wildlife Portrait", "02-lion.jpg", ("lion", "wildlife", "safari", "portrait")),
        ReferencePhotoAsset("elephant", "Elephant in Savanna", "03-elephant.jpg", ("elephant", "savanna", "wildlife", "animal")),
        ReferencePhotoAsset("parrot", "Colorful Parrot", "04-parrot.jpg", ("parrot", "bird", "colorful", "wildlife")),
        ReferencePhotoAsset("tiger", "Tiger Face Closeup", "05-tiger.jpg", ("tiger", "wildlife", "stripes", "portrait")),
        ReferencePhotoAsset("dolphin", "Dolphin Ocean Jump", "06-dolphin.jpg", ("dolphin", "ocean", "marine", "animal")),
        ReferencePhotoAsset("cat", "Cat Studio Portrait", "07-cat.jpg", ("cat", "pet", "portrait", "animal")),
        ReferencePhotoAsset("horse", "Horse Field Sunset", "08-horse.jpg", ("horse", "field", "sunset", "animal")),
    ],
    "people": [
        ReferencePhotoAsset("portrait", "Friendly Professional Portrait", "01-portrait.jpg", ("portrait", "professional", "headshot", "people")),
        ReferencePhotoAsset("group", "Friends Group Lifestyle", "02-group.jpg", ("group", "friends", "lifestyle", "community")),
        ReferencePhotoAsset("family", "Family Candid Moment", "03-family.jpg", ("family", "lifestyle", "candid", "home")),
        ReferencePhotoAsset("team", "Business Team Portrait", "04-team.jpg", ("team", "business", "professionals", "portrait")),
        ReferencePhotoAsset("student", "Student Professional Headshot", "05-student.jpg", ("student", "portrait", "professional", "people")),
        ReferencePhotoAsset("family-outdoor", "Outdoor Family Portrait", "06-family-outdoor.jpg", ("family", "outdoor", "portrait", "lifestyle")),
        ReferencePhotoAsset("business-man", "Business Man Portrait", "07-business-man.jpg", ("business", "man", "portrait", "professional")),
        ReferencePhotoAsset("traveler", "Traveler Outdoor Portrait", "08-traveler.jpg", ("traveler", "outdoor", "portrait", "people")),
    ],
    "minimal": [
        ReferencePhotoAsset("plant-vase", "Minimal Plant Vase", "01-plant-vase.jpg", ("plant", "vase", "clean", "minimal")),
        ReferencePhotoAsset("zen-stones", "Stacked Zen Stones", "02-zen-stones.jpg", ("stones", "zen", "neutral", "minimal")),
        ReferencePhotoAsset("chair", "Simple Modern Chair", "03-chair.jpg", ("chair", "modern", "clean", "minimal")),
        ReferencePhotoAsset("potted-plant", "Potted Plant on White", "04-potted-plant.jpg", ("plant", "pot", "white", "minimal")),
        ReferencePhotoAsset("ceramics", "Neutral Ceramic Vases", "05-ceramics.jpg", ("vase", "ceramic", "neutral", "still-life")),
        ReferencePhotoAsset("frame", "Empty Frame Mockup", "06-frame.jpg", ("frame", "mockup", "wall", "clean")),
        ReferencePhotoAsset("desk", "Clean Desk Setup", "07-desk.jpg", ("desk", "workspace", "clean", "minimal")),
        ReferencePhotoAsset("cup", "Minimal Coffee Cup", "08-cup.jpg", ("cup", "coffee", "white", "minimal")),
    ],
}


CATEGORY_SUBJECTS: dict[str, list[AssetSubject]] = {
    "nature": [
        AssetSubject("mountains", "Alpine Lake Mountain Sunrise", "nature landscape mountains lake sunrise", ("mountains", "lake", "sunrise", "landscape")),
        AssetSubject("forest", "Deep Forest Sunlit Trail", "forest trees trail green canopy", ("forest", "trees", "trail", "green")),
        AssetSubject("waterfall", "Rainforest Waterfall Pool", "waterfall river tropical forest landscape", ("waterfall", "river", "forest", "water")),
        AssetSubject("river", "Winding River Valley", "river valley landscape water hills", ("river", "valley", "water", "landscape")),
        AssetSubject("flowers", "Wildflower Meadow Closeup", "flowers meadow botanical macro nature", ("flowers", "meadow", "botanical", "macro")),
        AssetSubject("sunset", "Warm Ocean Sunset", "sunset ocean sky warm horizon", ("sunset", "ocean", "sky", "horizon")),
        AssetSubject("leaves", "Fresh Green Leaf Detail", "green leaves botanical dew close up", ("leaves", "botanical", "green", "closeup")),
        AssetSubject("valley", "Green Mountain Valley", "valley mountains hills landscape", ("valley", "mountains", "hills", "landscape")),
        AssetSubject("lake", "Still Blue Lake Reflection", "lake reflection mountains calm water", ("lake", "reflection", "water", "calm")),
        AssetSubject("desert", "Desert Dunes Golden Light", "desert dunes sunset warm sand", ("desert", "dunes", "sand", "sunset")),
        AssetSubject("coast", "Rocky Coastline Waves", "coast ocean waves rocks landscape", ("coast", "ocean", "waves", "rocks")),
        AssetSubject("garden", "Botanical Garden Path", "garden plants flowers path nature", ("garden", "plants", "flowers", "path")),
    ],
    "business": [
        AssetSubject("meeting", "Executive Team Meeting", "business meeting professionals conference room", ("meeting", "teamwork", "professionals", "office")),
        AssetSubject("handshake", "Corporate Handshake Agreement", "business handshake agreement partnership", ("handshake", "agreement", "partnership", "corporate")),
        AssetSubject("charts", "Financial Analytics Charts", "business charts analytics growth dashboard", ("charts", "analytics", "growth", "finance")),
        AssetSubject("laptop", "Professional Laptop Workspace", "business laptop desk workspace remote", ("laptop", "workspace", "desk", "professional")),
        AssetSubject("presentation", "Boardroom Presentation", "business presentation speaker audience charts", ("presentation", "speaker", "boardroom", "charts")),
        AssetSubject("team", "Office Team Collaboration", "business office team collaboration planning", ("team", "collaboration", "office", "planning")),
        AssetSubject("building", "Corporate Glass Buildings", "business corporate buildings skyline finance", ("building", "corporate", "skyline", "finance")),
        AssetSubject("workspace", "Modern Creative Workspace", "business modern workspace notebook coffee", ("workspace", "notebook", "coffee", "modern")),
        AssetSubject("strategy", "Strategy Planning Table", "business strategy documents planning charts", ("strategy", "planning", "documents", "charts")),
        AssetSubject("startup", "Startup Brainstorm Session", "business startup brainstorm team sticky notes", ("startup", "brainstorm", "team", "ideas")),
        AssetSubject("finance", "Finance Report Desk", "business finance reports calculator office", ("finance", "reports", "calculator", "office")),
        AssetSubject("remote", "Remote Work Desk Setup", "business remote work video call laptop", ("remote", "video-call", "laptop", "desk")),
    ],
    "food-drink": [
        AssetSubject("salad", "Fresh Garden Salad Bowl", "food salad fresh vegetables healthy", ("salad", "vegetables", "healthy", "meal")),
        AssetSubject("burger", "Classic Burger and Fries", "burger fries restaurant meal food", ("burger", "fries", "restaurant", "meal")),
        AssetSubject("coffee", "Latte Coffee Cup", "coffee latte cafe beverage drink", ("coffee", "latte", "cafe", "beverage")),
        AssetSubject("pasta", "Tomato Basil Pasta Plate", "pasta tomato basil italian food", ("pasta", "tomato", "basil", "italian")),
        AssetSubject("fruit", "Colorful Fresh Fruit Bowl", "fruit berries citrus healthy food", ("fruit", "berries", "citrus", "healthy")),
        AssetSubject("juice", "Orange Juice Glass", "juice orange beverage citrus drink", ("juice", "orange", "beverage", "citrus")),
        AssetSubject("cake", "Chocolate Cake Dessert", "cake dessert chocolate bakery", ("cake", "dessert", "chocolate", "bakery")),
        AssetSubject("vegetables", "Market Vegetable Spread", "vegetables peppers ingredients fresh market", ("vegetables", "ingredients", "fresh", "market")),
        AssetSubject("sushi", "Sushi Plate Arrangement", "sushi japanese food seafood plate", ("sushi", "seafood", "plate", "restaurant")),
        AssetSubject("breakfast", "Breakfast Table Spread", "breakfast eggs toast coffee table", ("breakfast", "eggs", "toast", "coffee")),
        AssetSubject("pizza", "Artisan Pizza Slice", "pizza cheese tomato restaurant food", ("pizza", "cheese", "tomato", "restaurant")),
        AssetSubject("dessert", "Berry Dessert Parfait", "dessert parfait berries cream", ("dessert", "berries", "cream", "sweet")),
    ],
    "technology": [
        AssetSubject("chip", "Computer Chip Macro", "computer chip microprocessor circuit macro", ("chip", "microprocessor", "circuit", "macro")),
        AssetSubject("code", "Programming Code Editor", "software development programming code screen", ("code", "software", "developer", "screen")),
        AssetSubject("laptop", "Laptop and Smartphone Devices", "laptop smartphone devices workspace technology", ("laptop", "smartphone", "devices", "workspace")),
        AssetSubject("ai", "Artificial Intelligence Neural Visual", "artificial intelligence neural network ai visual", ("ai", "neural", "network", "futuristic")),
        AssetSubject("vr", "Virtual Reality Headset", "virtual reality headset immersive technology", ("vr", "headset", "immersive", "device")),
        AssetSubject("cloud", "Cloud Computing Network", "cloud computing network servers digital", ("cloud", "network", "servers", "digital")),
        AssetSubject("server", "Server Data Center", "server data center racks cloud infrastructure", ("server", "data-center", "infrastructure", "cloud")),
        AssetSubject("robot", "Robotic Hand Automation", "robotics robotic hand automation engineering", ("robotics", "robotic-hand", "automation", "engineering")),
        AssetSubject("security", "Cybersecurity Shield Lock", "cybersecurity shield lock digital protection", ("cybersecurity", "shield", "lock", "protection")),
        AssetSubject("analytics", "Data Analytics Dashboard", "data analytics dashboard charts technology", ("analytics", "dashboard", "charts", "data")),
        AssetSubject("devices", "Smart Devices Ecosystem", "smart devices mobile tablet wearable technology", ("smart-devices", "mobile", "tablet", "wearable")),
        AssetSubject("automation", "Automation Workflow Interface", "automation workflow digital interface software", ("automation", "workflow", "interface", "software")),
    ],
    "fashion": [
        AssetSubject("model", "Editorial Fashion Portrait", "fashion model editorial portrait clothing", ("model", "editorial", "portrait", "clothing")),
        AssetSubject("rack", "Clothing Rack Boutique", "clothing rack boutique fashion garments", ("clothing", "rack", "boutique", "garments")),
        AssetSubject("shoes", "White Sneakers Product Shot", "fashion shoes sneakers product style", ("shoes", "sneakers", "product", "style")),
        AssetSubject("jacket", "Tailored Jacket Look", "fashion jacket tailored outfit model", ("jacket", "tailored", "outfit", "model")),
        AssetSubject("sunglasses", "Sunglasses Style Portrait", "sunglasses fashion accessories style", ("sunglasses", "accessories", "style", "portrait")),
        AssetSubject("jewelry", "Jewelry Accessories Flatlay", "jewelry accessories fashion flatlay", ("jewelry", "accessories", "flatlay", "gold")),
        AssetSubject("handbag", "Luxury Handbag Detail", "handbag fashion accessories product", ("handbag", "accessories", "product", "luxury")),
        AssetSubject("dress", "Evening Dress Silhouette", "dress fashion silhouette runway", ("dress", "silhouette", "runway", "style")),
        AssetSubject("fabric", "Textile Fabric Texture", "fabric textile pattern fashion", ("fabric", "textile", "pattern", "texture")),
        AssetSubject("runway", "Runway Light Stage", "runway fashion stage lights", ("runway", "stage", "lights", "model")),
        AssetSubject("street", "Street Style Outfit", "street style fashion outfit urban", ("street-style", "outfit", "urban", "model")),
        AssetSubject("makeup", "Beauty Makeup Products", "makeup beauty fashion cosmetics", ("makeup", "beauty", "cosmetics", "product")),
    ],
    "fitness": [
        AssetSubject("gym", "Gym Strength Workout", "gym workout fitness strength training", ("gym", "workout", "strength", "training")),
        AssetSubject("yoga", "Calm Yoga Practice", "yoga wellness stretch fitness", ("yoga", "wellness", "stretch", "calm")),
        AssetSubject("weights", "Weight Training Set", "weights dumbbells training gym", ("weights", "dumbbells", "training", "gym")),
        AssetSubject("running", "Outdoor Running Motion", "running cardio sports outdoor fitness", ("running", "cardio", "sports", "outdoor")),
        AssetSubject("dumbbells", "Dumbbells and Bottle", "dumbbells water bottle gym equipment", ("dumbbells", "bottle", "equipment", "gym")),
        AssetSubject("cycling", "Road Cycling Athlete", "cycling bike athlete road sport", ("cycling", "bike", "athlete", "road")),
        AssetSubject("gear", "Workout Gear Flatlay", "workout gear mat rope bottle fitness", ("gear", "mat", "rope", "bottle")),
        AssetSubject("boxing", "Boxing Training Gloves", "boxing gloves training sports fitness", ("boxing", "gloves", "training", "sports")),
        AssetSubject("pilates", "Pilates Studio Session", "pilates studio wellness exercise", ("pilates", "studio", "wellness", "exercise")),
        AssetSubject("swimming", "Swimming Pool Lanes", "swimming pool lanes fitness sport", ("swimming", "pool", "lanes", "sport")),
        AssetSubject("football", "Sports Field Training", "football sports field training team", ("football", "field", "team", "training")),
        AssetSubject("health", "Healthy Active Lifestyle", "health fitness wellness active lifestyle", ("health", "wellness", "active", "lifestyle")),
    ],
    "travel": [
        AssetSubject("beach", "Tropical Beach Palm", "travel beach tropical palm ocean", ("beach", "tropical", "palm", "ocean")),
        AssetSubject("airplane", "Airplane in Blue Sky", "airplane flight sky travel", ("airplane", "flight", "sky", "journey")),
        AssetSubject("mountains", "Mountain Destination Pier", "travel mountains lake destination", ("mountains", "lake", "destination", "pier")),
        AssetSubject("balloons", "Hot Air Balloons Valley", "hot air balloons valley travel", ("hot-air-balloons", "valley", "adventure", "travel")),
        AssetSubject("island", "White Island Village", "island village sea vacation travel", ("island", "village", "sea", "vacation")),
        AssetSubject("skyline", "Night City Skyline", "city skyline travel night destination", ("city", "skyline", "night", "destination")),
        AssetSubject("roadtrip", "Road Trip Camper Van", "road trip camper van mountains travel", ("roadtrip", "camper", "van", "mountains")),
        AssetSubject("park", "National Park Canyon", "national park canyon travel landscape", ("national-park", "canyon", "landscape", "travel")),
        AssetSubject("hotel", "Boutique Hotel Pool", "hotel resort pool vacation travel", ("hotel", "resort", "pool", "vacation")),
        AssetSubject("train", "Scenic Train Journey", "train travel scenic railway journey", ("train", "railway", "scenic", "journey")),
        AssetSubject("map", "Travel Map Planning", "travel map passport camera planning", ("map", "passport", "camera", "planning")),
        AssetSubject("landmark", "Historic Landmark Plaza", "landmark tourism city plaza travel", ("landmark", "tourism", "city", "plaza")),
    ],
    "abstract": [
        AssetSubject("fluid", "Colorful Fluid Art", "abstract fluid art colorful paint", ("fluid", "colorful", "paint", "art")),
        AssetSubject("marble", "Dark Marble Texture", "marble texture abstract stone", ("marble", "texture", "stone", "abstract")),
        AssetSubject("geometric", "Geometric Color Blocks", "geometric shapes abstract colorful", ("geometric", "shapes", "colorful", "blocks")),
        AssetSubject("gradient", "Soft Gradient Background", "gradient background abstract pastel", ("gradient", "background", "pastel", "soft")),
        AssetSubject("neon", "Neon Light Lines", "neon lines abstract dark futuristic", ("neon", "lines", "dark", "futuristic")),
        AssetSubject("pastel", "Pastel Wave Pattern", "pastel pattern waves abstract", ("pastel", "pattern", "waves", "soft")),
        AssetSubject("lineart", "Black White Line Art", "line art black white abstract", ("line-art", "black-white", "pattern", "abstract")),
        AssetSubject("texture", "Paper Texture Field", "texture paper abstract background", ("texture", "paper", "background", "neutral")),
        AssetSubject("pattern", "Repeating Graphic Pattern", "pattern graphic abstract repeat", ("pattern", "graphic", "repeat", "abstract")),
        AssetSubject("mesh", "Vibrant Mesh Gradient", "mesh gradient vibrant abstract", ("mesh", "gradient", "vibrant", "abstract")),
        AssetSubject("minimal", "Minimal Concept Shapes", "minimal abstract concept shapes", ("minimal", "concept", "shapes", "clean")),
        AssetSubject("prism", "Prismatic Light Refraction", "prism light color abstract", ("prism", "light", "color", "refraction")),
    ],
    "architecture": [
        AssetSubject("house", "Modern House Exterior", "modern house exterior architecture", ("house", "modern", "exterior", "home")),
        AssetSubject("glass", "Glass Office Building", "glass building office architecture", ("glass", "office", "building", "modern")),
        AssetSubject("interior", "Minimal Living Interior", "interior design room architecture", ("interior", "room", "design", "minimal")),
        AssetSubject("skyline", "Urban City Skyline", "city skyline architecture buildings", ("city", "skyline", "buildings", "urban")),
        AssetSubject("office", "Contemporary Office Interior", "office interior architecture workplace", ("office", "interior", "workplace", "modern")),
        AssetSubject("bridge", "Steel Bridge Structure", "bridge architecture structure engineering", ("bridge", "structure", "engineering", "city")),
        AssetSubject("museum", "Modern Museum Atrium", "museum atrium architecture modern", ("museum", "atrium", "modern", "public")),
        AssetSubject("historical", "Historic Stone Staircase", "historical architecture stone staircase", ("historical", "stone", "staircase", "classic")),
        AssetSubject("facade", "Patterned Building Facade", "facade building pattern architecture", ("facade", "pattern", "building", "architecture")),
        AssetSubject("skyscraper", "Skyscraper Looking Up", "skyscraper glass towers architecture", ("skyscraper", "glass", "towers", "urban")),
        AssetSubject("cafe", "Architectural Cafe Corner", "cafe exterior architecture street", ("cafe", "exterior", "street", "architecture")),
        AssetSubject("courtyard", "Sunlit Courtyard Architecture", "courtyard architecture arches sunlight", ("courtyard", "arches", "sunlight", "architecture")),
    ],
    "animals": [
        AssetSubject("dog", "Golden Dog Portrait", "dog pet portrait animal", ("dog", "pet", "portrait", "animal")),
        AssetSubject("lion", "Lion Wildlife Closeup", "lion wildlife safari portrait", ("lion", "wildlife", "safari", "portrait")),
        AssetSubject("elephant", "Elephant in Savanna", "elephant savanna wildlife animal", ("elephant", "savanna", "wildlife", "animal")),
        AssetSubject("parrot", "Colorful Parrot Branch", "parrot bird colorful wildlife", ("parrot", "bird", "colorful", "wildlife")),
        AssetSubject("tiger", "Tiger Face Closeup", "tiger wildlife stripes animal", ("tiger", "wildlife", "stripes", "portrait")),
        AssetSubject("dolphin", "Dolphin Ocean Jump", "dolphin ocean marine animal", ("dolphin", "ocean", "marine", "animal")),
        AssetSubject("cat", "Cat Studio Portrait", "cat pet portrait animal", ("cat", "pet", "portrait", "animal")),
        AssetSubject("horse", "Horse Field Sunset", "horse field sunset animal", ("horse", "field", "sunset", "animal")),
        AssetSubject("bird", "Birds in Flight", "birds flight sky wildlife", ("birds", "flight", "sky", "wildlife")),
        AssetSubject("fish", "Tropical Fish Reef", "fish reef marine colorful", ("fish", "reef", "marine", "colorful")),
        AssetSubject("deer", "Deer Forest Wildlife", "deer forest wildlife nature", ("deer", "forest", "wildlife", "nature")),
        AssetSubject("butterfly", "Butterfly Flower Macro", "butterfly flower macro insect", ("butterfly", "flower", "macro", "insect")),
    ],
    "people": [
        AssetSubject("portrait", "Professional Portrait", "people portrait professional headshot", ("portrait", "professional", "headshot", "person")),
        AssetSubject("group", "Friends Group Lifestyle", "people group friends lifestyle", ("group", "friends", "lifestyle", "community")),
        AssetSubject("family", "Family Candid Moment", "family people lifestyle candid", ("family", "lifestyle", "candid", "home")),
        AssetSubject("team", "Business Team Portrait", "people team business professionals", ("team", "business", "professionals", "portrait")),
        AssetSubject("student", "Student Learning Moment", "student learning education people", ("student", "learning", "education", "people")),
        AssetSubject("creator", "Creator Studio Workspace", "creator studio camera people", ("creator", "studio", "camera", "workspace")),
        AssetSubject("workplace", "Workplace Collaboration", "workplace collaboration office people", ("workplace", "collaboration", "office", "people")),
        AssetSubject("fitness", "Active Lifestyle Person", "person fitness active lifestyle", ("fitness", "active", "lifestyle", "person")),
        AssetSubject("travel", "Traveler Outdoor Portrait", "traveler outdoor portrait people", ("traveler", "outdoor", "portrait", "people")),
        AssetSubject("artist", "Artist Creative Portrait", "artist creative portrait studio", ("artist", "creative", "portrait", "studio")),
        AssetSubject("doctor", "Healthcare Professional", "doctor healthcare professional portrait", ("doctor", "healthcare", "professional", "people")),
        AssetSubject("chef", "Chef Restaurant Portrait", "chef restaurant professional people", ("chef", "restaurant", "professional", "people")),
    ],
    "minimal": [
        AssetSubject("plant", "Minimal Plant Vase", "minimal plant vase clean background", ("plant", "vase", "clean", "background")),
        AssetSubject("stones", "Stacked Zen Stones", "minimal stones zen neutral", ("stones", "zen", "neutral", "simple")),
        AssetSubject("chair", "Simple Modern Chair", "minimal chair modern clean", ("chair", "modern", "clean", "interior")),
        AssetSubject("vase", "Neutral Ceramic Vases", "minimal vase ceramic neutral", ("vase", "ceramic", "neutral", "still-life")),
        AssetSubject("frame", "Empty Frame Mockup", "minimal empty frame mockup wall", ("frame", "mockup", "wall", "clean")),
        AssetSubject("desk", "Clean Desk Setup", "minimal desk workspace clean", ("desk", "workspace", "clean", "simple")),
        AssetSubject("cup", "Isolated Coffee Cup", "minimal cup isolated whitespace", ("cup", "isolated", "whitespace", "clean")),
        AssetSubject("product", "Neutral Product Plinth", "minimal product plinth studio", ("product", "plinth", "studio", "neutral")),
        AssetSubject("lamp", "Modern Desk Lamp", "minimal lamp desk interior", ("lamp", "desk", "interior", "modern")),
        AssetSubject("book", "Clean Book Flatlay", "minimal book flatlay neutral", ("book", "flatlay", "neutral", "simple")),
        AssetSubject("interior", "Neutral Interior Corner", "minimal interior neutral clean", ("interior", "neutral", "clean", "corner")),
        AssetSubject("paper", "Blank Paper Composition", "minimal paper blank layout", ("paper", "blank", "layout", "whitespace")),
    ],
    "technical-diagrams": [
        AssetSubject("distributed-systems", "Distributed Systems Architecture", "distributed system architecture diagram distributed computing multiple servers network nodes", ("distributed", "system", "architecture", "diagram", "distributed-systems", "multiple-servers", "network-nodes")),
        AssetSubject("system-architecture", "System Architecture Diagram", "system architecture diagram components services infrastructure database", ("system", "architecture", "diagram", "components", "services", "infrastructure")),
        AssetSubject("client-server", "Client Server Architecture", "client server architecture diagram client server communication api backend database", ("client", "server", "architecture", "diagram", "communication", "backend")),
        AssetSubject("microservices", "Microservices Architecture", "microservices architecture diagram api gateway services service mesh database per service", ("microservices", "architecture", "diagram", "api-gateway", "service-mesh", "backend")),
        AssetSubject("backend-architecture", "Backend Architecture", "backend system architecture diagram api gateway app server cache queue database worker", ("backend", "architecture", "diagram", "api", "cache", "queue", "database")),
        AssetSubject("database-architecture", "Database Architecture", "database architecture diagram schema storage replication cache query layer", ("database", "architecture", "diagram", "schema", "replication", "storage")),
        AssetSubject("cloud-architecture", "Cloud Architecture", "cloud architecture diagram compute storage network database load balancer service", ("cloud", "architecture", "diagram", "compute", "storage", "network")),
        AssetSubject("network-diagrams", "Network Diagram", "computer network architecture diagram router switch client server topology nodes", ("network", "diagram", "router", "switch", "server", "topology")),
        AssetSubject("api-architecture", "API Gateway Architecture", "api gateway architecture diagram authentication client backend services database", ("api", "gateway", "architecture", "diagram", "authentication", "backend")),
        AssetSubject("load-balancing", "Load Balancing Architecture", "load balancer architecture diagram traffic distribution multiple servers health checks", ("load", "balancing", "load-balancer", "architecture", "diagram", "traffic")),
        AssetSubject("sharding", "Database Sharding Architecture", "database sharding architecture diagram shard router partition distributed database replicas", ("database", "sharding", "architecture", "diagram", "shard", "router", "partition")),
        AssetSubject("distributed-database", "Distributed Database Architecture", "distributed database architecture diagram replication partitions nodes consensus router", ("distributed", "database", "architecture", "diagram", "replication", "partitions")),
        AssetSubject("operating-systems", "Operating Systems Process Diagram", "operating systems process flow diagram scheduler memory kernel io", ("operating-system", "process", "kernel", "scheduler", "memory", "diagram")),
        AssetSubject("process-flow", "Process Flow Diagram", "process flow diagram input process decision output workflow arrows", ("process", "flow", "diagram", "workflow", "decision", "input-output")),
        AssetSubject("data-flow", "Data Flow Diagram", "data flow diagram ingestion processing storage output pipeline architecture", ("data", "flow", "diagram", "pipeline", "ingestion", "storage")),
        AssetSubject("software-architecture", "Software Architecture", "software architecture diagram layers modules components services database", ("software", "architecture", "diagram", "layers", "modules", "components")),
        AssetSubject("ai-architecture", "AI Architecture Diagram", "ai architecture diagram prompt model inference vector database agents pipeline", ("ai", "architecture", "diagram", "model", "inference", "vector-database")),
        AssetSubject("machine-learning", "Machine Learning Architecture", "machine learning architecture diagram data pipeline training inference model registry", ("machine-learning", "architecture", "diagram", "training", "inference", "model")),
        AssetSubject("devops-architecture", "DevOps Architecture", "devops architecture diagram ci cd pipeline build deploy monitor infrastructure", ("devops", "architecture", "diagram", "ci-cd", "pipeline", "monitoring")),
    ],
}


CATEGORY_PALETTES: dict[str, list[tuple[str, str, str, str]]] = {
    "nature": [("#0f5132", "#86efac", "#facc15", "#dcfce7"), ("#075985", "#7dd3fc", "#fde68a", "#ecfeff"), ("#166534", "#4ade80", "#fb7185", "#f0fdf4")],
    "business": [("#0f172a", "#475569", "#60a5fa", "#e2e8f0"), ("#1e1b4b", "#6366f1", "#22d3ee", "#eef2ff"), ("#111827", "#334155", "#10b981", "#f8fafc")],
    "food-drink": [("#7c2d12", "#fb923c", "#fde68a", "#fff7ed"), ("#166534", "#84cc16", "#ef4444", "#fefce8"), ("#831843", "#f472b6", "#f59e0b", "#fff1f2")],
    "technology": [("#020617", "#0f172a", "#38bdf8", "#a78bfa"), ("#082f49", "#0e7490", "#67e8f9", "#dbeafe"), ("#111827", "#4c1d95", "#22d3ee", "#f0abfc")],
    "fashion": [("#3b0764", "#be185d", "#f9a8d4", "#fdf2f8"), ("#111827", "#6b7280", "#fbbf24", "#f9fafb"), ("#881337", "#fb7185", "#f472b6", "#fff1f2")],
    "fitness": [("#052e16", "#16a34a", "#bbf7d0", "#f0fdf4"), ("#7c2d12", "#f97316", "#fde68a", "#fff7ed"), ("#172554", "#2563eb", "#a7f3d0", "#eff6ff")],
    "travel": [("#075985", "#0ea5e9", "#fde68a", "#ecfeff"), ("#431407", "#fb923c", "#facc15", "#fff7ed"), ("#164e63", "#14b8a6", "#bae6fd", "#f0fdfa")],
    "abstract": [("#4c1d95", "#ec4899", "#22d3ee", "#fdf4ff"), ("#020617", "#2563eb", "#f97316", "#dbeafe"), ("#0f766e", "#5eead4", "#f0abfc", "#ccfbf1")],
    "architecture": [("#1f2937", "#94a3b8", "#f8fafc", "#e5e7eb"), ("#172554", "#60a5fa", "#f59e0b", "#dbeafe"), ("#44403c", "#d6d3d1", "#78716c", "#fafaf9")],
    "animals": [("#422006", "#d97706", "#fde68a", "#fff7ed"), ("#164e63", "#38bdf8", "#f97316", "#ecfeff"), ("#365314", "#84cc16", "#facc15", "#f7fee7")],
    "people": [("#312e81", "#6366f1", "#f59e0b", "#eef2ff"), ("#831843", "#ec4899", "#fde68a", "#fdf2f8"), ("#1e293b", "#0ea5e9", "#fca5a5", "#f8fafc")],
    "minimal": [("#f5f5f4", "#e7e5e4", "#a8a29e", "#ffffff"), ("#f8fafc", "#e2e8f0", "#64748b", "#ffffff"), ("#fafafa", "#f4f4f5", "#18181b", "#ffffff")],
    "technical-diagrams": [("#020617", "#111827", "#43D68A", "#E5E7EB"), ("#07111F", "#13233B", "#55A6FF", "#E0F2FE"), ("#12091F", "#211235", "#CF8CFF", "#FAF5FF")],
}


ADDITIONAL_CATEGORY_SUBJECT_KEYS: dict[str, list[str]] = {
    "education": ["classroom", "online-course", "books", "graduation", "study-desk", "student", "library", "whiteboard", "school", "tutorial", "learning-app", "certificate"],
    "healthcare": ["doctor", "clinic", "stethoscope", "hospital", "wellness", "medicine", "nurse", "telehealth", "heart-care", "lab-report", "fitness-health", "pharmacy"],
    "finance": ["banking", "investment", "stock-chart", "calculator", "budget", "credit-card", "wallet", "report", "coin-stack", "analytics", "insurance", "tax"],
    "marketing": ["campaign", "brand-board", "analytics", "content-calendar", "megaphone", "social-post", "email", "seo", "creative-team", "launch", "audience", "strategy"],
    "social-media": ["creator-phone", "likes", "video-post", "influencer", "content-grid", "livestream", "comment-bubbles", "story-template", "camera", "engagement", "feed", "hashtag"],
    "events": ["conference", "stage", "party", "tickets", "wedding", "workshop", "concert", "festival", "invitation", "podium", "calendar", "celebration"],
    "sports": ["stadium", "basketball", "football", "tennis", "running-track", "trophy", "team", "training", "cycling", "swimming", "fitness-field", "scoreboard"],
    "music": ["guitar", "microphone", "piano", "headphones", "studio", "concert-stage", "vinyl", "dj", "sound-wave", "violin", "playlist", "speaker"],
    "entertainment": ["cinema", "film-camera", "streaming", "popcorn", "stage-lights", "performer", "media-screen", "comedy", "ticket", "spotlight", "television", "red-carpet"],
    "real-estate": ["modern-home", "for-sale", "interior", "kitchen", "apartment", "floor-plan", "keys", "neighborhood", "luxury-house", "office-space", "agent", "mortgage"],
    "e-commerce": ["shopping-cart", "product-card", "checkout", "delivery-box", "storefront", "sale-banner", "mobile-shop", "package", "payment", "warehouse", "customer-review", "retail"],
    "startup": ["pitch-deck", "founders", "rocket-launch", "brainstorm", "growth-chart", "prototype", "innovation", "investor", "team-desk", "mvp", "idea-board", "accelerator"],
    "office": ["desk-setup", "meeting-room", "notebook", "laptop", "calendar", "task-board", "office-chair", "workspace", "printer", "coffee-break", "documents", "productivity"],
    "lifestyle": ["morning-routine", "home-corner", "wellness", "coffee-moment", "city-walk", "family-home", "travel-bag", "reading", "self-care", "outdoor-day", "kitchen-life", "weekend"],
    "beauty": ["cosmetics", "skincare", "makeup-brush", "spa", "perfume", "lipstick", "serum", "salon", "beauty-flatlay", "nail-polish", "haircare", "glow"],
    "luxury": ["gold-detail", "premium-watch", "marble-room", "jewelry", "luxury-car", "boutique", "champagne", "silk", "black-gold", "designer-bag", "hotel-suite", "elegant-dinner"],
    "automotive": ["sports-car", "city-drive", "car-interior", "electric-vehicle", "garage", "road-trip", "dashboard", "motorcycle", "showroom", "charging-station", "wheel-detail", "highway"],
    "gaming": ["controller", "esports-stage", "neon-setup", "console", "keyboard", "headset", "stream-overlay", "arcade", "game-ui", "score-screen", "vr-game", "pixel-badge"],
    "science": ["microscope", "lab-glassware", "chemistry", "researcher", "dna", "experiment", "molecule", "space-lab", "data-research", "biology", "physics", "robot-lab"],
    "space": ["galaxy", "planet", "astronaut", "rocket", "nebula", "moon-base", "satellite", "star-field", "cosmic-gradient", "space-station", "mars", "orbit"],
    "environment": ["solar-panels", "wind-turbine", "recycling", "green-city", "forest-care", "electric-grid", "eco-home", "water-conservation", "sustainability", "clean-energy", "earth", "leaf-icon"],
    "agriculture": ["crop-field", "tractor", "greenhouse", "harvest", "farm-road", "wheat", "organic-produce", "irrigation", "barn", "soil", "orchard", "market-crate"],
    "festivals": ["lanterns", "fireworks", "cultural-dance", "holiday-lights", "gift-box", "parade", "celebration-table", "confetti", "festival-stage", "rangoli", "carnival", "decorations"],
    "backgrounds": ["soft-gradient", "dark-gradient", "paper-backdrop", "studio-wall", "abstract-light", "clean-space", "poster-bg", "neutral-backdrop", "color-wash", "spotlight", "mesh-bg", "minimal-bg"],
    "textures": ["paper-texture", "marble-texture", "fabric-texture", "wood-grain", "concrete", "grain", "linen", "metal", "stone", "watercolor", "leather", "noise"],
    "patterns": ["geometric-pattern", "seamless-dots", "stripe-pattern", "wave-pattern", "grid-pattern", "floral-pattern", "abstract-repeat", "checker", "line-pattern", "organic-pattern", "tile", "retro-pattern"],
    "gradients": ["mesh-gradient", "sunset-gradient", "neon-gradient", "pastel-gradient", "blue-gradient", "warm-gradient", "rainbow-gradient", "duotone", "aurora", "radial-gradient", "soft-blend", "vivid-gradient"],
    "illustrations": ["editorial-people", "vector-city", "flat-device", "character", "workflow", "hero-illustration", "business-scene", "creative-scene", "education-scene", "health-scene", "startup-scene", "abstract-figure"],
    "icons": ["outline-icons", "solid-icons", "interface-icons", "business-icons", "social-icons", "arrow-icons", "finance-icons", "health-icons", "education-icons", "media-icons", "badge-icons", "navigation-icons"],
    "stickers": ["sparkle-sticker", "sale-sticker", "emoji-sticker", "badge-sticker", "arrow-sticker", "heart-sticker", "star-sticker", "label-sticker", "speech-sticker", "fun-sticker", "premium-sticker", "new-sticker"],
    "frames": ["photo-frame", "poster-border", "polaroid", "decorative-frame", "rounded-frame", "gold-frame", "minimal-frame", "film-frame", "social-frame", "collage-frame", "circle-frame", "label-frame"],
    "mockups": ["phone-mockup", "laptop-mockup", "poster-mockup", "package-mockup", "tshirt-mockup", "business-card", "tablet-mockup", "book-cover", "billboard", "social-post", "screen-mockup", "product-box"],
    "product-images": ["bottle-product", "box-product", "shoe-product", "bag-product", "cosmetic-product", "tech-device", "cup-product", "watch-product", "furniture-product", "food-package", "isolated-object", "studio-product"],
    "ui-elements": ["button-set", "card-ui", "dashboard-widget", "toggle-switch", "form-field", "navbar", "modal", "pricing-card", "progress-bar", "notification", "profile-card", "app-screen"],
    "infographics": ["timeline", "process-steps", "cycle-diagram", "comparison", "flowchart", "stats-panel", "roadmap", "pyramid", "matrix", "checklist", "funnel", "workflow"],
    "charts": ["bar-chart", "line-chart", "pie-chart", "dashboard", "growth-graph", "finance-chart", "analytics-board", "kpi-card", "data-grid", "donut-chart", "scatter-plot", "report-chart"],
    "maps": ["world-map", "city-map", "route-map", "pin-location", "travel-map", "campus-map", "metro-map", "terrain-map", "gps-screen", "delivery-route", "country-map", "navigation-map"],
}

CATEGORY_QUERY_PREFIXES: dict[str, str] = {
    "education": "classroom students teacher university books learning",
    "healthcare": "doctor nurse hospital medical healthcare medicine",
    "finance": "banking finance investment stock market money financial planning",
    "marketing": "digital marketing advertising branding campaign analytics",
    "social-media": "content creator smartphone social media marketing influencer online content",
    "events": "conference event stage celebration seminar party audience",
    "sports": "athlete football basketball running sports competition stadium",
    "music": "musician concert guitar piano recording studio headphones",
}

_palette_cycle = [
    [("#0f172a", "#2563eb", "#38bdf8", "#dbeafe"), ("#111827", "#7c3aed", "#f0abfc", "#faf5ff"), ("#082f49", "#14b8a6", "#a7f3d0", "#ecfeff")],
    [("#431407", "#f97316", "#fde68a", "#fff7ed"), ("#831843", "#ec4899", "#f9a8d4", "#fdf2f8"), ("#3b0764", "#a855f7", "#e9d5ff", "#faf5ff")],
    [("#14532d", "#22c55e", "#bbf7d0", "#f0fdf4"), ("#164e63", "#06b6d4", "#cffafe", "#ecfeff"), ("#365314", "#84cc16", "#ecfccb", "#f7fee7")],
    [("#1f2937", "#64748b", "#e5e7eb", "#f8fafc"), ("#44403c", "#d6d3d1", "#fafaf9", "#ffffff"), ("#020617", "#475569", "#cbd5e1", "#f8fafc")],
]

for category_index, (category_slug, keys) in enumerate(ADDITIONAL_CATEGORY_SUBJECT_KEYS.items()):
    CATEGORY_SUBJECTS.setdefault(category_slug, [
        AssetSubject(
            key,
            key.replace("-", " ").title(),
            f"{CATEGORY_QUERY_PREFIXES.get(category_slug, category_slug.replace('-', ' '))} {key.replace('-', ' ')} high quality design asset",
            tuple(part for part in key.split("-") if part) + (category_slug,),
        )
        for key in keys
    ])
    CATEGORY_PALETTES.setdefault(category_slug, _palette_cycle[category_index % len(_palette_cycle)])


ASPECT_RATIOS = [(2400, 1600), (1800, 2400), (2000, 2000), (2400, 1540), (1600, 2000), (2560, 1440)]
STYLE_SUFFIXES = ["wide angle", "close-up", "editorial", "flat lay", "clean background", "dynamic crop", "soft light", "high contrast", "studio", "environmental"]


def build_curated_image_assets(category_slug: str | None = None, limit_per_category: int = 100) -> list[tuple]:
    selected_categories = [category_slug] if category_slug else CANONICAL_CATEGORIES
    invalid = [category for category in selected_categories if category not in CATEGORY_SUBJECTS]
    if invalid:
        raise ValueError(f"Unsupported curated asset category: {invalid[0]}")

    assets: list[tuple] = []
    limit = max(1, int(limit_per_category or 100))
    for category in selected_categories:
        subjects = CATEGORY_SUBJECTS[category]
        reference_assets = _build_reference_photo_assets(category, limit)
        assets.extend(reference_assets)

        for index in range(len(reference_assets), limit):
            subject = subjects[index % len(subjects)]
            cycle = index // len(subjects)
            width, height = ASPECT_RATIOS[(index + cycle) % len(ASPECT_RATIOS)]
            category_fragment = category.replace("-", "")[:8]
            asset_id = f"cur_img_{category_fragment}_{index + 1:03d}_{subject.key[:8]}"
            style = STYLE_SUFFIXES[(index + len(subject.key)) % len(STYLE_SUFFIXES)]
            title = f"{subject.title} {style.title()} {index + 1:03d}"
            tags = ",".join([
                f"category:{category}",
                category,
                subject.key,
                *subject.tags,
                f"query:{_slugify(subject.query)}",
                f"style:{_slugify(style)}",
                f"variant:{index + 1:03d}",
            ])
            svg = _render_svg(category, subject, width, height, index, style)
            data_url = "data:image/svg+xml;base64," + base64.b64encode(svg.encode("utf-8")).decode("ascii")
            local_path = f"local://teckstudio/generated-assets/{asset_id}.svg"
            assets.append((
                asset_id,
                title,
                "images",
                tags,
                data_url,
                "image/svg+xml",
                "application-owned-curated",
                local_path,
                "Application-owned generated asset",
                None,
                "TECKSTUDIO application-owned curated asset library",
                "local-curated-seed",
                width,
                height,
                local_path,
            ))
    return assets


def _build_reference_photo_assets(category: str, limit: int) -> list[tuple]:
    category_fragment = category.replace("-", "")[:8]
    photo_subjects = REFERENCE_PHOTO_SUBJECTS.get(category, [])
    media_dir = REFERENCE_MEDIA_DIR / category
    media_files = sorted([
        path for path in media_dir.glob("*")
        if path.suffix.lower() in {".jpg", ".jpeg", ".png"}
    ])
    assets: list[tuple] = []
    if not photo_subjects:
        return assets

    for index, media_file in enumerate(media_files[:limit]):
        photo = photo_subjects[index % len(photo_subjects)]
        title = photo.title if index < len(photo_subjects) else f"{photo.title} Photo Variant {index + 1:03d}"

        asset_id = f"cur_img_{category_fragment}_{index + 1:03d}_photo"
        full_file, thumbnail_file, width, height = _ensure_reference_derivatives(category, media_file)
        media_url = f"/media/asset-library-full/{category}/{full_file.name}"
        thumbnail_url = f"/media/asset-library-thumbnails/{category}/{thumbnail_file.name}"
        mime_type = "image/jpeg" if full_file.suffix.lower() in {".jpg", ".jpeg"} else "image/png"
        tags = ",".join([
            f"category:{category}",
            category,
            photo.key,
            *photo.tags,
            f"query:{_slugify(photo.key)}",
            "style:photo-reference",
            f"variant:{index + 1:03d}",
        ])
        local_path = f"local://teckstudio/asset-library-full/{category}/{full_file.name}"
        assets.append((
            asset_id,
            title,
            "images",
            tags,
            media_url,
            mime_type,
            "user-provided-reference-crop",
            media_url,
            "User-provided reference asset",
            None,
            "User-provided reference image cropped into category asset",
            "local-reference-media",
            width,
            height,
            local_path,
            thumbnail_url,
        ))
    return assets


def _ensure_reference_derivatives(category: str, media_file: Path) -> tuple[Path, Path, int, int]:
    full_dir = REFERENCE_FULL_MEDIA_DIR / category
    thumbnail_dir = REFERENCE_THUMBNAIL_MEDIA_DIR / category
    full_dir.mkdir(parents=True, exist_ok=True)
    thumbnail_dir.mkdir(parents=True, exist_ok=True)
    full_file = full_dir / media_file.name
    thumbnail_file = thumbnail_dir / media_file.name

    try:
        from PIL import Image
        with Image.open(media_file) as source:
            source = source.convert("RGB") if source.mode not in {"RGB", "RGBA"} else source.copy()
            width, height = source.size
            long_edge = max(width, height)
            if long_edge < 1800:
                scale = 1800 / max(long_edge, 1)
                full_size = (max(1, round(width * scale)), max(1, round(height * scale)))
            else:
                full_size = (width, height)
            full_image = source.resize(full_size, Image.Resampling.LANCZOS) if full_size != source.size else source
            full_image.save(full_file, quality=96, optimize=True)

            thumb_long_edge = 420
            thumb_scale = thumb_long_edge / max(full_size)
            thumb_size = (max(1, round(full_size[0] * thumb_scale)), max(1, round(full_size[1] * thumb_scale)))
            thumbnail = full_image.resize(thumb_size, Image.Resampling.LANCZOS)
            thumbnail.save(thumbnail_file, quality=82, optimize=True)
            return full_file, thumbnail_file, full_size[0], full_size[1]
    except Exception:
        return media_file, media_file, *_image_dimensions(media_file)


def _image_dimensions(path: Path) -> tuple[int, int]:
    try:
        from PIL import Image
        with Image.open(path) as image:
            return int(image.width), int(image.height)
    except Exception:
        return 1, 1


def _slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _stable_number(value: str, modulo: int) -> int:
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % modulo


def _render_svg(category: str, subject: AssetSubject, width: int, height: int, index: int, style: str) -> str:
    palettes = CATEGORY_PALETTES[category]
    bg_a, bg_b, accent, light = palettes[(index + _stable_number(subject.key, len(palettes))) % len(palettes)]
    seed = _stable_number(f"{category}:{subject.key}:{index}", 9999)
    desc = escape(
        f"TECKSTUDIO application-owned generated asset. Category: {category}. "
        f"Subject: {subject.title}. Query: {subject.query}. Style: {style}. Variant: {index + 1}."
    )
    scene = _render_scene(category, subject.key, width, height, bg_a, bg_b, accent, light, seed)
    texture = _texture(width, height, light, seed)
    return f"""
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img">
  <title>{escape(subject.title)}</title>
  <desc>{desc}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="{bg_a}"/>
      <stop offset="1" stop-color="{bg_b}"/>
    </linearGradient>
    <radialGradient id="spot" cx="30%" cy="18%" r="70%">
      <stop stop-color="{light}" stop-opacity="0.36"/>
      <stop offset="1" stop-color="{light}" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="{max(8, height // 80)}" stdDeviation="{max(8, width // 120)}" flood-color="#000000" flood-opacity="0.22"/>
    </filter>
  </defs>
  <rect width="{width}" height="{height}" rx="{max(18, width // 36)}" fill="url(#bg)"/>
  <rect width="{width}" height="{height}" rx="{max(18, width // 36)}" fill="url(#spot)"/>
  {texture}
  {scene}
</svg>
""".strip()


def _texture(width: int, height: int, color: str, seed: int) -> str:
    circles = []
    for i in range(9):
        x = (seed * 17 + i * 173) % width
        y = (seed * 29 + i * 113) % height
        radius = max(14, min(width, height) // (12 + (i % 5)))
        opacity = 0.035 + (i % 4) * 0.018
        circles.append(f'<circle cx="{x}" cy="{y}" r="{radius}" fill="{color}" opacity="{opacity:.3f}"/>')
    return "\n  ".join(circles)


def _render_scene(category: str, key: str, width: int, height: int, bg_a: str, bg_b: str, accent: str, light: str, seed: int) -> str:
    if category == "technical-diagrams":
        return _technical_diagram_scene(key, width, height, accent, light, seed)
    if category == "technology":
        return _technology_scene(key, width, height, accent, light, seed)
    if category == "nature":
        return _nature_scene(key, width, height, accent, light, seed)
    if category == "business":
        return _business_scene(key, width, height, accent, light, seed)
    if category == "food-drink":
        return _food_scene(key, width, height, accent, light, seed)
    if category == "fashion":
        return _fashion_scene(key, width, height, accent, light, seed)
    if category == "fitness":
        return _fitness_scene(key, width, height, accent, light, seed)
    if category == "travel":
        return _travel_scene(key, width, height, accent, light, seed)
    if category == "abstract":
        return _abstract_scene(key, width, height, accent, light, seed)
    if category == "architecture":
        return _architecture_scene(key, width, height, accent, light, seed)
    if category == "animals":
        return _animals_scene(key, width, height, accent, light, seed)
    if category == "people":
        return _people_scene(key, width, height, accent, light, seed)
    if category == "education":
        return _education_scene(key, width, height, accent, light, seed)
    if category == "healthcare":
        return _healthcare_scene(key, width, height, accent, light, seed)
    if category == "finance":
        return _finance_scene(key, width, height, accent, light, seed)
    if category == "marketing":
        return _marketing_scene(key, width, height, accent, light, seed)
    if category == "social-media":
        return _social_media_scene(key, width, height, accent, light, seed)
    if category == "events":
        return _events_scene(key, width, height, accent, light, seed)
    if category == "sports":
        return _sports_scene(key, width, height, accent, light, seed)
    if category == "music":
        return _music_scene(key, width, height, accent, light, seed)
    return _minimal_scene(key, width, height, accent, light, seed)


def _technical_diagram_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    stroke = max(4, unit * 0.006)
    title = key.replace("-", " ").title()
    muted = "#64748b"
    card = "#111827"
    ink = light

    def label_for(value: str) -> str:
        labels = {
            "distributed-systems": "DISTRIBUTED SYSTEM",
            "system-architecture": "SYSTEM ARCHITECTURE",
            "client-server": "CLIENT SERVER",
            "microservices": "MICROSERVICES",
            "backend-architecture": "BACKEND ARCHITECTURE",
            "database-architecture": "DATABASE ARCHITECTURE",
            "cloud-architecture": "CLOUD ARCHITECTURE",
            "network-diagrams": "NETWORK TOPOLOGY",
            "api-architecture": "API ARCHITECTURE",
            "load-balancing": "LOAD BALANCING",
            "sharding": "DATABASE SHARDING",
            "distributed-database": "DISTRIBUTED DATABASE",
            "operating-systems": "OPERATING SYSTEM",
            "process-flow": "PROCESS FLOW",
            "data-flow": "DATA FLOW",
            "software-architecture": "SOFTWARE ARCHITECTURE",
            "ai-architecture": "AI ARCHITECTURE",
            "machine-learning": "ML ARCHITECTURE",
            "devops-architecture": "DEVOPS PIPELINE",
        }
        return labels.get(value, title.upper())

    def node(x: float, y: float, w: float, h: float, text: str, color: str | None = None) -> str:
        fill = color or card
        return (
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{unit*.025}" fill="{fill}" '
            f'stroke="{accent}" stroke-width="{stroke}" filter="url(#softShadow)"/>'
            f'<text x="{x + w/2}" y="{y + h*.54}" text-anchor="middle" dominant-baseline="middle" '
            f'font-family="Inter, Arial, sans-serif" font-size="{max(24, unit*.032)}" font-weight="800" '
            f'fill="{ink}" letter-spacing="{max(1, unit*.002)}">{escape(text)}</text>'
        )

    def db(x: float, y: float, w: float, h: float, text: str) -> str:
        return (
            f'<path d="M{x} {y + h*.2} C{x} {y}, {x + w} {y}, {x + w} {y + h*.2} '
            f'V{y + h*.8} C{x + w} {y + h}, {x} {y + h}, {x} {y + h*.8} Z '
            f'M{x} {y + h*.2} C{x} {y + h*.4}, {x + w} {y + h*.4}, {x + w} {y + h*.2} '
            f'M{x} {y + h*.52} C{x} {y + h*.72}, {x + w} {y + h*.72}, {x + w} {y + h*.52}" '
            f'fill="#0F172A" stroke="{accent}" stroke-width="{stroke}" filter="url(#softShadow)"/>'
            f'<text x="{x + w/2}" y="{y + h*.55}" text-anchor="middle" dominant-baseline="middle" '
            f'font-family="Inter, Arial, sans-serif" font-size="{max(22, unit*.028)}" font-weight="800" fill="{ink}">{escape(text)}</text>'
        )

    def arrow(x1: float, y1: float, x2: float, y2: float, dashed: bool = False) -> str:
        dash = f' stroke-dasharray="{unit*.018} {unit*.014}"' if dashed else ""
        angle = 0 if x2 >= x1 else 180
        if abs(y2 - y1) > abs(x2 - x1):
            angle = 90 if y2 >= y1 else -90
        return (
            f'<path d="M{x1} {y1} L{x2} {y2}" fill="none" stroke="{accent}" stroke-width="{stroke}" '
            f'stroke-linecap="round"{dash}/>'
            f'<path d="M{x2} {y2} l{-unit*.018} {-unit*.014} l{unit*.018} {unit*.038} l{unit*.018} {-unit*.038} Z" '
            f'fill="{accent}" transform="rotate({angle} {x2} {y2})"/>'
        )

    header = (
        f'<text x="{width*.50}" y="{height*.12}" text-anchor="middle" font-family="Inter, Arial, sans-serif" '
        f'font-size="{max(44, unit*.06)}" font-weight="900" fill="{ink}" letter-spacing="{max(4, unit*.008)}">{label_for(key)}</text>'
        f'<path d="M{width*.22} {height*.17} H{width*.78}" stroke="{accent}" stroke-width="{stroke*1.2}" stroke-linecap="round"/>'
    )

    left = width * 0.11
    mid = width * 0.39
    right = width * 0.67
    top = height * 0.28
    row = height * 0.21
    w = width * 0.22
    h = height * 0.12

    if key in {"sharding", "distributed-database"}:
        shards = "".join(db(width * (0.13 + i * 0.24), height * 0.64, width * 0.17, height * 0.13, f"SHARD {i + 1}") for i in range(3))
        links = "".join(arrow(width * 0.50, height * 0.51, width * (0.215 + i * 0.24), height * 0.64, i == 1) for i in range(3))
        return header + node(width*.19, top, w, h, "CLIENTS") + node(width*.39, height*.45, w, h, "ROUTER") + links + shards

    if key in {"microservices", "api-architecture", "backend-architecture"}:
        services = "".join(node(width * (0.18 + i * 0.22), height * 0.52, width * 0.16, height * 0.10, f"SERVICE {i + 1}") for i in range(3))
        links = arrow(width*.33, height*.35, width*.44, height*.35) + arrow(width*.55, height*.41, width*.26, height*.52, True) + arrow(width*.55, height*.41, width*.48, height*.52, True) + arrow(width*.55, height*.41, width*.70, height*.52, True)
        return header + node(width*.10, top, width*.20, h, "CLIENT") + node(width*.43, top, width*.24, h, "API GATEWAY") + links + services + db(width*.39, height*.74, width*.22, height*.13, "DATABASE")

    if key in {"load-balancing", "distributed-systems", "network-diagrams"}:
        servers = "".join(node(width * 0.62, height * (0.28 + i * 0.17), width * 0.22, height * 0.10, f"SERVER {i + 1}") for i in range(3))
        links = arrow(width*.30, height*.42, width*.43, height*.42) + "".join(arrow(width*.55, height*.42, width*.62, height*(0.33 + i*.17), i == 1) for i in range(3))
        return header + node(width*.10, height*.34, width*.20, h, "CLIENTS") + node(width*.43, height*.34, width*.12, h, "LB") + links + servers + db(width*.38, height*.73, width*.22, height*.12, "DB CLUSTER")

    if key in {"cloud-architecture", "devops-architecture", "ai-architecture", "machine-learning"}:
        cloud = f'<path d="M{width*.18} {height*.29} C{width*.22} {height*.19} {width*.34} {height*.18} {width*.41} {height*.27} C{width*.55} {height*.22} {width*.70} {height*.31} {width*.73} {height*.45} C{width*.82} {height*.48} {width*.84} {height*.65} {width*.71} {height*.70} H{width*.22} C{width*.08} {height*.69} {width*.07} {height*.49} {width*.18} {height*.43} Z" fill="#0F172A" stroke="{muted}" stroke-width="{stroke}" opacity="0.78"/>'
        return header + cloud + node(width*.17, height*.38, width*.17, height*.09, "INPUT") + node(width*.41, height*.33, width*.20, height*.10, "PROCESS") + db(width*.45, height*.53, width*.19, height*.12, "STORE") + node(width*.66, height*.40, width*.17, height*.09, "OUTPUT") + arrow(width*.34, height*.425, width*.41, height*.38) + arrow(width*.61, height*.38, width*.66, height*.445) + arrow(width*.52, height*.43, width*.54, height*.53, True)

    if key in {"process-flow", "data-flow", "operating-systems"}:
        return header + node(left, top, w, h, "INPUT") + arrow(left+w, top+h/2, mid, top+h/2) + node(mid, top, w, h, "PROCESS") + arrow(mid+w, top+h/2, right, top+h/2) + node(right, top, w, h, "OUTPUT") + node(mid, top+row, w, h, "DECISION") + arrow(mid+w/2, top+h, mid+w/2, top+row, True) + db(right, top+row, w, h, "STATE")

    return header + node(left, top, w, h, "CLIENT") + arrow(left+w, top+h/2, mid, top+h/2) + node(mid, top, w, h, "SERVICE") + arrow(mid+w, top+h/2, right, top+h/2) + db(right, top, w, h, "DATABASE") + node(mid, top+row, w, h, "CACHE") + arrow(mid+w/2, top+h, mid+w/2, top+row, True)


def _technology_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    cx, cy = width * 0.5, height * 0.52
    if key == "chip":
        pins = "\n".join(f'<rect x="{cx - unit * .28 + i * unit * .08}" y="{cy - unit * .34}" width="{unit * .035}" height="{unit * .13}" rx="4" fill="{light}" opacity="0.8"/>' for i in range(8))
        traces = "\n".join(f'<path d="M{cx - unit * .42 + i * unit * .12} {cy + unit * .28} H{cx - unit * .14 + i * unit * .08} V{cy + unit * (.08 - i * .018)}" fill="none" stroke="{accent}" stroke-width="{unit * .012}" stroke-linecap="round" opacity="0.85"/>' for i in range(7))
        return f'{pins}{traces}<rect x="{cx - unit*.24}" y="{cy - unit*.24}" width="{unit*.48}" height="{unit*.48}" rx="{unit*.05}" fill="#020617" stroke="{accent}" stroke-width="{unit*.025}" filter="url(#softShadow)"/><rect x="{cx - unit*.13}" y="{cy - unit*.13}" width="{unit*.26}" height="{unit*.26}" rx="{unit*.035}" fill="{accent}" opacity="0.9"/><circle cx="{cx}" cy="{cy}" r="{unit*.055}" fill="{light}" opacity="0.9"/>'
    if key == "code":
        lines = "\n".join(f'<rect x="{width*.22}" y="{height*.25 + i*unit*.045}" width="{unit*(.20 + (i % 5)*.055)}" height="{unit*.014}" rx="5" fill="{[accent, light, "#34d399"][i % 3]}" opacity="{0.45 + (i % 3)*0.18}"/>' for i in range(10))
        return f'<rect x="{width*.14}" y="{height*.16}" width="{width*.72}" height="{height*.58}" rx="{unit*.045}" fill="#020617" stroke="{light}" stroke-width="{unit*.01}" filter="url(#softShadow)"/>{lines}<rect x="{width*.24}" y="{height*.80}" width="{width*.52}" height="{unit*.035}" rx="12" fill="{light}" opacity="0.55"/>'
    if key == "laptop":
        return f'<rect x="{width*.20}" y="{height*.24}" width="{width*.44}" height="{height*.36}" rx="{unit*.025}" fill="#111827" stroke="{light}" stroke-width="{unit*.012}" filter="url(#softShadow)"/><rect x="{width*.24}" y="{height*.29}" width="{width*.36}" height="{height*.23}" rx="8" fill="{accent}" opacity="0.55"/><rect x="{width*.16}" y="{height*.62}" width="{width*.54}" height="{unit*.045}" rx="12" fill="{light}" opacity="0.8"/><rect x="{width*.69}" y="{height*.32}" width="{width*.13}" height="{height*.28}" rx="18" fill="#020617" stroke="{accent}" stroke-width="{unit*.012}"/><circle cx="{width*.755}" cy="{height*.56}" r="{unit*.012}" fill="{light}"/>'
    if key == "ai":
        nodes = []
        for i in range(11):
            x = width * (0.22 + ((i * 19 + seed) % 54) / 100)
            y = height * (0.22 + ((i * 31 + seed) % 50) / 100)
            nodes.append(f'<circle cx="{x}" cy="{y}" r="{unit*.028}" fill="{accent}" opacity="0.95"/>')
            if i > 0:
                px = width * (0.22 + (((i - 1) * 19 + seed) % 54) / 100)
                py = height * (0.22 + (((i - 1) * 31 + seed) % 50) / 100)
                nodes.append(f'<path d="M{px} {py} L{x} {y}" stroke="{light}" stroke-width="{unit*.008}" opacity="0.5"/>')
        return "\n".join(nodes) + f'<circle cx="{cx}" cy="{cy}" r="{unit*.22}" fill="none" stroke="{light}" stroke-width="{unit*.012}" opacity="0.35"/>'
    if key == "vr":
        return f'<rect x="{width*.22}" y="{height*.34}" width="{width*.56}" height="{height*.24}" rx="{unit*.11}" fill="#0f172a" stroke="{accent}" stroke-width="{unit*.018}" filter="url(#softShadow)"/><rect x="{width*.30}" y="{height*.40}" width="{width*.17}" height="{height*.10}" rx="18" fill="{light}" opacity="0.55"/><rect x="{width*.53}" y="{height*.40}" width="{width*.17}" height="{height*.10}" rx="18" fill="{light}" opacity="0.55"/><path d="M{width*.23} {height*.47} C{width*.07} {height*.38} {width*.08} {height*.62} {width*.25} {height*.56}" fill="none" stroke="{light}" stroke-width="{unit*.022}" opacity="0.6"/>'
    if key == "cloud":
        links = "\n".join(f'<path d="M{width*.23+i*width*.11} {height*.70} V{height*.56}" stroke="{light}" stroke-width="{unit*.01}" opacity="0.5"/><circle cx="{width*.23+i*width*.11}" cy="{height*.72}" r="{unit*.025}" fill="{accent}"/>' for i in range(6))
        return f'<path d="M{width*.28} {height*.48} C{width*.30} {height*.34} {width*.43} {height*.29} {width*.52} {height*.38} C{width*.67} {height*.34} {width*.78} {height*.45} {width*.77} {height*.57} C{width*.77} {height*.69} {width*.66} {height*.74} {width*.49} {height*.74} H{width*.30} C{width*.17} {height*.73} {width*.14} {height*.63} {width*.20} {height*.55} C{width*.22} {height*.52} {width*.25} {height*.50} {width*.28} {height*.48} Z" fill="{light}" opacity="0.78" filter="url(#softShadow)"/>{links}'
    if key == "server":
        racks = "\n".join(f'<rect x="{width*(.18+i*.16)}" y="{height*.18}" width="{width*.11}" height="{height*.60}" rx="12" fill="#0f172a" stroke="{light}" stroke-width="{unit*.008}"/>' + "".join(f'<circle cx="{width*(.205+i*.16)}" cy="{height*(.25+j*.09)}" r="{unit*.01}" fill="{accent}"/><rect x="{width*(.23+i*.16)}" y="{height*(.24+j*.09)}" width="{width*.045}" height="{unit*.012}" rx="4" fill="{light}" opacity="0.55"/>' for j in range(6)) for i in range(5))
        return racks
    if key == "robot":
        return f'<path d="M{width*.22} {height*.70} C{width*.36} {height*.49} {width*.44} {height*.45} {width*.58} {height*.31}" fill="none" stroke="{light}" stroke-width="{unit*.055}" stroke-linecap="round" filter="url(#softShadow)"/><circle cx="{width*.38}" cy="{height*.50}" r="{unit*.07}" fill="{accent}"/><rect x="{width*.55}" y="{height*.20}" width="{unit*.22}" height="{unit*.18}" rx="18" fill="#e2e8f0"/><path d="M{width*.62} {height*.25} l{unit*.15} {-unit*.10} M{width*.62} {height*.31} l{unit*.15} {unit*.08}" stroke="{accent}" stroke-width="{unit*.018}" stroke-linecap="round"/>'
    if key == "security":
        return f'<path d="M{cx} {height*.18} L{width*.70} {height*.30} V{height*.50} C{width*.70} {height*.66} {width*.60} {height*.78} {cx} {height*.86} C{width*.40} {height*.78} {width*.30} {height*.66} {width*.30} {height*.50} V{height*.30} Z" fill="{accent}" opacity="0.9" filter="url(#softShadow)"/><rect x="{width*.43}" y="{height*.48}" width="{width*.14}" height="{height*.13}" rx="14" fill="#0f172a"/><path d="M{width*.46} {height*.49} V{height*.43} C{width*.46} {height*.34} {width*.54} {height*.34} {width*.54} {height*.43} V{height*.49}" fill="none" stroke="{light}" stroke-width="{unit*.018}"/>'
    if key == "analytics":
        bars = "\n".join(f'<rect x="{width*(.23+i*.09)}" y="{height*(.68 - i*.045)}" width="{width*.055}" height="{height*(.12+i*.045)}" rx="8" fill="{[accent, light][i%2]}" opacity="0.85"/>' for i in range(6))
        return f'<rect x="{width*.15}" y="{height*.18}" width="{width*.70}" height="{height*.62}" rx="{unit*.04}" fill="#0f172a" opacity="0.78" filter="url(#softShadow)"/>{bars}<path d="M{width*.22} {height*.54} C{width*.36} {height*.42} {width*.45} {height*.48} {width*.57} {height*.33} S{width*.73} {height*.36} {width*.80} {height*.26}" fill="none" stroke="{accent}" stroke-width="{unit*.016}" stroke-linecap="round"/>'
    if key == "devices":
        return f'<rect x="{width*.22}" y="{height*.22}" width="{width*.30}" height="{height*.45}" rx="22" fill="#111827" stroke="{light}" stroke-width="{unit*.01}" filter="url(#softShadow)"/><rect x="{width*.57}" y="{height*.30}" width="{width*.18}" height="{height*.34}" rx="24" fill="#020617" stroke="{accent}" stroke-width="{unit*.012}"/><circle cx="{width*.66}" cy="{height*.59}" r="{unit*.012}" fill="{light}"/><circle cx="{width*.38}" cy="{height*.74}" r="{unit*.055}" fill="{accent}" opacity="0.75"/>'
    return f'<rect x="{width*.17}" y="{height*.22}" width="{width*.66}" height="{height*.52}" rx="{unit*.05}" fill="#0f172a" opacity="0.72" filter="url(#softShadow)"/><path d="M{width*.25} {height*.38} H{width*.42} V{height*.30} H{width*.62} V{height*.46} H{width*.76}" fill="none" stroke="{accent}" stroke-width="{unit*.018}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="{width*.42}" cy="{height*.30}" r="{unit*.026}" fill="{light}"/><circle cx="{width*.62}" cy="{height*.46}" r="{unit*.026}" fill="{light}"/><circle cx="{width*.76}" cy="{height*.46}" r="{unit*.026}" fill="{accent}"/>'


def _nature_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    sun_x = width * (0.22 + (seed % 45) / 100)
    mountain = f'<circle cx="{sun_x}" cy="{height*.20}" r="{min(width, height)*.07}" fill="{accent}" opacity="0.9"/><path d="M0 {height*.78} L{width*.20} {height*.42} L{width*.38} {height*.72} L{width*.58} {height*.33} L{width*.88} {height*.78} Z" fill="#064e3b" opacity="0.9"/><path d="M0 {height*.84} C{width*.18} {height*.75} {width*.32} {height*.89} {width*.52} {height*.78} C{width*.70} {height*.68} {width*.84} {height*.78} {width} {height*.68} V{height} H0 Z" fill="{light}" opacity="0.5"/>'
    if key in {"forest", "garden", "leaves"}:
        trees = "\n".join(f'<rect x="{width*(.12+i*.075)}" y="{height*(.42+(i%3)*.04)}" width="{width*.018}" height="{height*.28}" fill="#422006"/><circle cx="{width*(.13+i*.075)}" cy="{height*(.36+(i%3)*.035)}" r="{min(width,height)*(.055+(i%4)*.008)}" fill="{["#166534", "#22c55e", "#84cc16"][i%3]}" opacity="0.88"/>' for i in range(10))
        return f'{trees}<path d="M0 {height*.78} C{width*.28} {height*.68} {width*.48} {height*.82} {width} {height*.68} V{height} H0 Z" fill="{light}" opacity="0.38"/>'
    if key == "waterfall":
        return f'<path d="M{width*.14} {height*.74} L{width*.34} {height*.25} L{width*.58} {height*.74} Z" fill="#14532d" opacity="0.9"/><path d="M{width*.37} {height*.26} C{width*.44} {height*.44} {width*.40} {height*.56} {width*.50} {height*.76}" fill="none" stroke="{light}" stroke-width="{min(width,height)*.06}" opacity="0.85"/><ellipse cx="{width*.50}" cy="{height*.78}" rx="{width*.24}" ry="{height*.06}" fill="{accent}" opacity="0.55"/>'
    if key in {"flowers", "coast", "desert"}:
        blossoms = "\n".join(f'<circle cx="{width*(.16+(i%7)*.11)}" cy="{height*(.56+(i%4)*.07)}" r="{min(width,height)*.028}" fill="{[accent, light, "#fb7185", "#fde68a"][i%4]}" opacity="0.9"/>' for i in range(18))
        return f'{mountain}{blossoms}'
    return mountain


def _business_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key == "handshake":
        return f'<rect x="{width*.18}" y="{height*.38}" width="{width*.25}" height="{unit*.12}" rx="{unit*.06}" fill="{light}" transform="rotate(-14 {width*.30} {height*.44})" filter="url(#softShadow)"/><rect x="{width*.56}" y="{height*.38}" width="{width*.25}" height="{unit*.12}" rx="{unit*.06}" fill="{accent}" transform="rotate(14 {width*.68} {height*.44})"/><circle cx="{width*.50}" cy="{height*.48}" r="{unit*.085}" fill="#fef3c7"/><rect x="{width*.16}" y="{height*.65}" width="{width*.68}" height="{height*.07}" rx="18" fill="{light}" opacity="0.45"/>'
    if key in {"charts", "finance", "strategy"}:
        bars = "\n".join(f'<rect x="{width*(.24+i*.09)}" y="{height*(.66-i*.04)}" width="{width*.055}" height="{height*(.13+i*.04)}" rx="8" fill="{[accent, light][i%2]}"/>' for i in range(6))
        return f'<rect x="{width*.15}" y="{height*.17}" width="{width*.70}" height="{height*.62}" rx="{unit*.04}" fill="#111827" opacity="0.75" filter="url(#softShadow)"/>{bars}<path d="M{width*.20} {height*.50} C{width*.36} {height*.42} {width*.48} {height*.48} {width*.62} {height*.32} S{width*.75} {height*.34} {width*.82} {height*.27}" fill="none" stroke="{accent}" stroke-width="{unit*.014}"/>'
    if key in {"meeting", "team", "startup", "presentation"}:
        people = "".join(f'<circle cx="{width*(.25+i*.125)}" cy="{height*(.31+(i%2)*.05)}" r="{unit*.035}" fill="{[light, accent, "#fde68a"][i%3]}"/><path d="M{width*(.22+i*.125)} {height*.46} q{unit*.035} {-unit*.08} {unit*.07} 0 v{unit*.11} h{-unit*.14} z" fill="{[accent, light, "#60a5fa"][i%3]}" opacity="0.85"/>' for i in range(5))
        return f'<ellipse cx="{width*.50}" cy="{height*.67}" rx="{width*.34}" ry="{height*.08}" fill="{light}" opacity="0.42"/>{people}<rect x="{width*.62}" y="{height*.18}" width="{width*.20}" height="{height*.22}" rx="12" fill="#f8fafc" opacity="0.8"/>'
    return f'<rect x="{width*.18}" y="{height*.25}" width="{width*.48}" height="{height*.34}" rx="22" fill="#111827" stroke="{light}" stroke-width="{unit*.01}" filter="url(#softShadow)"/><rect x="{width*.22}" y="{height*.32}" width="{width*.40}" height="{height*.05}" rx="10" fill="{accent}" opacity="0.7"/><rect x="{width*.22}" y="{height*.42}" width="{width*.28}" height="{height*.04}" rx="8" fill="{light}" opacity="0.55"/><rect x="{width*.16}" y="{height*.63}" width="{width*.52}" height="{unit*.04}" rx="12" fill="{light}" opacity="0.65"/>'


def _food_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    plate = f'<ellipse cx="{width*.50}" cy="{height*.58}" rx="{width*.30}" ry="{height*.17}" fill="#fff7ed" opacity="0.94" filter="url(#softShadow)"/><ellipse cx="{width*.50}" cy="{height*.58}" rx="{width*.20}" ry="{height*.10}" fill="{accent}" opacity="0.78"/>'
    if key == "coffee":
        return f'<ellipse cx="{width*.46}" cy="{height*.52}" rx="{unit*.14}" ry="{unit*.10}" fill="#fef3c7" filter="url(#softShadow)"/><ellipse cx="{width*.46}" cy="{height*.50}" rx="{unit*.10}" ry="{unit*.06}" fill="#92400e"/><path d="M{width*.58} {height*.50} q{unit*.11} {unit*.02} {unit*.05} {unit*.11}" fill="none" stroke="#fef3c7" stroke-width="{unit*.028}"/><rect x="{width*.32}" y="{height*.66}" width="{width*.34}" height="{unit*.035}" rx="16" fill="{light}" opacity="0.7"/>'
    if key == "burger":
        return f'<path d="M{width*.30} {height*.47} q{width*.20} {-height*.16} {width*.40} 0 z" fill="#f59e0b"/><rect x="{width*.30}" y="{height*.48}" width="{width*.40}" height="{height*.05}" rx="16" fill="#84cc16"/><rect x="{width*.28}" y="{height*.53}" width="{width*.44}" height="{height*.06}" rx="18" fill="#7c2d12"/><rect x="{width*.30}" y="{height*.60}" width="{width*.40}" height="{height*.06}" rx="20" fill="#fbbf24"/><rect x="{width*.18}" y="{height*.72}" width="{width*.64}" height="{unit*.035}" rx="16" fill="{light}" opacity="0.55"/>'
    fruit = "".join(f'<circle cx="{width*(.34+(i%5)*.08)}" cy="{height*(.50+(i%3)*.055)}" r="{unit*.045}" fill="{["#ef4444", "#f97316", "#84cc16", "#a855f7", "#fde68a"][i%5]}"/>' for i in range(13))
    if key in {"fruit", "vegetables", "salad"}:
        return plate + fruit
    if key in {"cake", "dessert"}:
        return f'<rect x="{width*.30}" y="{height*.43}" width="{width*.40}" height="{height*.18}" rx="18" fill="#7f1d1d" filter="url(#softShadow)"/><rect x="{width*.30}" y="{height*.49}" width="{width*.40}" height="{height*.035}" fill="{light}" opacity="0.75"/><circle cx="{width*.50}" cy="{height*.39}" r="{unit*.045}" fill="#ef4444"/><rect x="{width*.24}" y="{height*.66}" width="{width*.52}" height="{unit*.035}" rx="16" fill="{light}" opacity="0.55"/>'
    return plate + f'<path d="M{width*.36} {height*.55} C{width*.45} {height*.48} {width*.53} {height*.67} {width*.64} {height*.52}" fill="none" stroke="{light}" stroke-width="{unit*.024}" stroke-linecap="round"/><path d="M{width*.34} {height*.63} C{width*.45} {height*.55} {width*.53} {height*.74} {width*.66} {height*.60}" fill="none" stroke="#fef3c7" stroke-width="{unit*.019}" stroke-linecap="round"/>'


def _fashion_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key in {"rack", "fabric"}:
        hangers = "".join(f'<path d="M{width*(.24+i*.07)} {height*.31} q{unit*.035} {-unit*.05} {unit*.07} 0" fill="none" stroke="{light}" stroke-width="{unit*.008}"/><path d="M{width*(.24+i*.07)} {height*.34} l{-unit*.04} {unit*.28} h{unit*.11} l{-unit*.04} {-unit*.28} z" fill="{[accent, light, "#fbbf24"][i%3]}" opacity="0.82"/>' for i in range(7))
        return f'<path d="M{width*.18} {height*.25} H{width*.82}" stroke="{light}" stroke-width="{unit*.012}"/>{hangers}'
    if key in {"shoes", "sunglasses", "jewelry", "handbag", "makeup"}:
        return f'<rect x="{width*.24}" y="{height*.44}" width="{width*.24}" height="{height*.10}" rx="{unit*.04}" fill="{light}" filter="url(#softShadow)"/><rect x="{width*.50}" y="{height*.44}" width="{width*.24}" height="{height*.10}" rx="{unit*.04}" fill="{accent}" filter="url(#softShadow)"/><circle cx="{width*.36}" cy="{height*.32}" r="{unit*.07}" fill="none" stroke="{light}" stroke-width="{unit*.014}"/><circle cx="{width*.61}" cy="{height*.32}" r="{unit*.07}" fill="none" stroke="{accent}" stroke-width="{unit*.014}"/><path d="M{width*.24} {height*.68} H{width*.76}" stroke="{light}" stroke-width="{unit*.012}" opacity="0.45"/>'
    return f'<circle cx="{width*.50}" cy="{height*.18}" r="{unit*.055}" fill="#fde68a"/><path d="M{width*.47} {height*.25} C{width*.38} {height*.36} {width*.34} {height*.61} {width*.30} {height*.80} H{width*.70} C{width*.66} {height*.61} {width*.62} {height*.36} {width*.53} {height*.25} Z" fill="{accent}" filter="url(#softShadow)"/><path d="M{width*.39} {height*.35} C{width*.24} {height*.41} {width*.20} {height*.52} {width*.16} {height*.67}" fill="none" stroke="{light}" stroke-width="{unit*.032}" stroke-linecap="round" opacity="0.55"/><path d="M{width*.61} {height*.35} C{width*.76} {height*.41} {width*.80} {height*.52} {width*.84} {height*.67}" fill="none" stroke="{light}" stroke-width="{unit*.032}" stroke-linecap="round" opacity="0.55"/>'


def _fitness_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key in {"weights", "dumbbells", "gym"}:
        return f'<rect x="{width*.22}" y="{height*.47}" width="{width*.56}" height="{unit*.045}" rx="16" fill="{light}" filter="url(#softShadow)"/><circle cx="{width*.20}" cy="{height*.49}" r="{unit*.075}" fill="{accent}"/><circle cx="{width*.80}" cy="{height*.49}" r="{unit*.075}" fill="{accent}"/><circle cx="{width*.13}" cy="{height*.49}" r="{unit*.055}" fill="{light}"/><circle cx="{width*.87}" cy="{height*.49}" r="{unit*.055}" fill="{light}"/><rect x="{width*.28}" y="{height*.70}" width="{width*.44}" height="{unit*.035}" rx="14" fill="{light}" opacity="0.45"/>'
    if key == "yoga":
        return f'<circle cx="{width*.50}" cy="{height*.24}" r="{unit*.055}" fill="#fde68a"/><path d="M{width*.50} {height*.32} C{width*.42} {height*.46} {width*.36} {height*.54} {width*.24} {height*.66}" fill="none" stroke="{light}" stroke-width="{unit*.032}" stroke-linecap="round"/><path d="M{width*.50} {height*.32} C{width*.58} {height*.46} {width*.64} {height*.54} {width*.76} {height*.66}" fill="none" stroke="{accent}" stroke-width="{unit*.032}" stroke-linecap="round"/><rect x="{width*.18}" y="{height*.74}" width="{width*.64}" height="{unit*.035}" rx="16" fill="{light}" opacity="0.55"/>'
    if key in {"running", "cycling", "football"}:
        return f'<circle cx="{width*.45}" cy="{height*.25}" r="{unit*.048}" fill="{light}"/><path d="M{width*.45} {height*.32} L{width*.54} {height*.48} L{width*.68} {height*.58}" fill="none" stroke="{accent}" stroke-width="{unit*.03}" stroke-linecap="round"/><path d="M{width*.49} {height*.42} L{width*.34} {height*.56} M{width*.54} {height*.48} L{width*.42} {height*.72}" fill="none" stroke="{light}" stroke-width="{unit*.026}" stroke-linecap="round"/><path d="M{width*.16} {height*.80} C{width*.38} {height*.70} {width*.62} {height*.88} {width*.84} {height*.76}" fill="none" stroke="{light}" stroke-width="{unit*.018}" opacity="0.45"/>'
    return f'<rect x="{width*.22}" y="{height*.44}" width="{width*.18}" height="{height*.18}" rx="18" fill="{accent}" filter="url(#softShadow)"/><rect x="{width*.47}" y="{height*.38}" width="{width*.26}" height="{height*.08}" rx="16" fill="{light}"/><circle cx="{width*.62}" cy="{height*.58}" r="{unit*.07}" fill="{accent}" opacity="0.75"/><rect x="{width*.24}" y="{height*.74}" width="{width*.52}" height="{unit*.035}" rx="14" fill="{light}" opacity="0.45"/>'


def _travel_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key == "airplane":
        return f'<path d="M{width*.15} {height*.38} L{width*.78} {height*.52} L{width*.54} {height*.60} L{width*.40} {height*.77} L{width*.36} {height*.56} Z" fill="{light}" filter="url(#softShadow)"/><path d="M{width*.15} {height*.38} L{width*.36} {height*.56} L{width*.42} {height*.46} Z" fill="{accent}" opacity="0.65"/><circle cx="{width*.76}" cy="{height*.20}" r="{unit*.07}" fill="{accent}" opacity="0.85"/>'
    if key == "balloons":
        balloons = "".join(f'<path d="M{width*(.28+i*.15)} {height*(.30+(i%2)*.08)} c{unit*.06} {-unit*.09} {unit*.16} 0 {unit*.11} {unit*.11} c{-unit*.025} {unit*.08} {-unit*.09} {unit*.12} {-unit*.11} {unit*.18} c{-unit*.025} {-unit*.06} {-unit*.09} {-unit*.10} {-unit*.11} {-unit*.18} c{-unit*.03} {-unit*.06} {unit*.00} {-unit*.11} {unit*.11} {-unit*.11} z" fill="{[accent, light, "#fb923c"][i%3]}"/>' for i in range(4))
        return balloons + f'<path d="M0 {height*.76} C{width*.28} {height*.64} {width*.52} {height*.86} {width} {height*.68} V{height} H0 Z" fill="{light}" opacity="0.35"/>'
    if key in {"beach", "island"}:
        return f'<circle cx="{width*.74}" cy="{height*.21}" r="{unit*.075}" fill="{accent}"/><path d="M0 {height*.60} C{width*.26} {height*.52} {width*.48} {height*.70} {width} {height*.55} V{height} H0 Z" fill="{light}" opacity="0.55"/><path d="M{width*.20} {height*.65} C{width*.40} {height*.58} {width*.56} {height*.76} {width*.82} {height*.64}" fill="none" stroke="{accent}" stroke-width="{unit*.022}" opacity="0.75"/><path d="M{width*.30} {height*.47} c{unit*.08} {-unit*.14} {unit*.15} {-unit*.12} {unit*.20} 0" fill="none" stroke="#14532d" stroke-width="{unit*.023}" stroke-linecap="round"/>'
    if key in {"skyline", "landmark", "hotel"}:
        buildings = "".join(f'<rect x="{width*(.12+i*.08)}" y="{height*(.50-(i%4)*.06)}" width="{width*.055}" height="{height*(.28+(i%4)*.06)}" fill="{[light, accent, "#0f172a"][i%3]}" opacity="0.85"/>' for i in range(9))
        return buildings + f'<rect x="0" y="{height*.80}" width="{width}" height="{height*.20}" fill="#020617" opacity="0.24"/>'
    return f'<circle cx="{width*.76}" cy="{height*.20}" r="{unit*.07}" fill="{accent}"/><path d="M0 {height*.77} L{width*.24} {height*.43} L{width*.42} {height*.72} L{width*.62} {height*.34} L{width} {height*.77} V{height} H0 Z" fill="{light}" opacity="0.58"/><path d="M{width*.10} {height*.86} C{width*.32} {height*.72} {width*.56} {height*.90} {width*.90} {height*.70}" fill="none" stroke="{accent}" stroke-width="{unit*.018}" opacity="0.65"/>'


def _abstract_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key in {"geometric", "pattern", "lineart"}:
        polygons = "".join(f'<polygon points="{width*(.18+i*.12)},{height*.30} {width*(.28+i*.12)},{height*.50} {width*(.12+i*.12)},{height*.53}" fill="{[accent, light, "#f97316", "#22d3ee"][i%4]}" opacity="0.78"/>' for i in range(6))
        return polygons + f'<path d="M{width*.10} {height*.76} H{width*.90}" stroke="{light}" stroke-width="{unit*.012}" opacity="0.38"/>'
    if key == "neon":
        return f'<path d="M{width*.18} {height*.75} L{width*.58} {height*.22}" stroke="{accent}" stroke-width="{unit*.018}" stroke-linecap="round" filter="url(#softShadow)"/><path d="M{width*.44} {height*.82} L{width*.82} {height*.28}" stroke="{light}" stroke-width="{unit*.014}" stroke-linecap="round"/><circle cx="{width*.68}" cy="{height*.58}" r="{unit*.07}" fill="{accent}" opacity="0.28"/>'
    blobs = "".join(f'<circle cx="{width*(.22+(i%4)*.18)}" cy="{height*(.28+(i%3)*.18)}" r="{unit*(.09+(i%3)*.035)}" fill="{[accent, light, "#f0abfc", "#67e8f9"][i%4]}" opacity="{0.42 + (i%3)*0.12}"/>' for i in range(9))
    return blobs + f'<path d="M{width*.10} {height*.62} C{width*.30} {height*.24} {width*.52} {height*.90} {width*.88} {height*.40}" fill="none" stroke="{light}" stroke-width="{unit*.022}" stroke-linecap="round" opacity="0.5"/>'


def _architecture_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key in {"bridge", "courtyard"}:
        cables = "".join(f'<path d="M{width*.15} {height*.70} C{width*.32} {height*(.34+i*.03)} {width*.68} {height*(.34+i*.03)} {width*.85} {height*.70}" fill="none" stroke="{light}" stroke-width="{unit*.008}" opacity="0.7"/>' for i in range(4))
        return f'<path d="M{width*.12} {height*.72} H{width*.88}" stroke="{accent}" stroke-width="{unit*.035}" stroke-linecap="round"/>{cables}<path d="M{width*.22} {height*.72} V{height*.38} M{width*.78} {height*.72} V{height*.38}" stroke="{light}" stroke-width="{unit*.018}"/>'
    if key in {"interior", "office", "cafe"}:
        return f'<rect x="{width*.16}" y="{height*.18}" width="{width*.68}" height="{height*.56}" rx="{unit*.035}" fill="{light}" opacity="0.75" filter="url(#softShadow)"/><rect x="{width*.23}" y="{height*.30}" width="{width*.22}" height="{height*.17}" fill="#ffffff" opacity="0.55"/><rect x="{width*.52}" y="{height*.34}" width="{width*.21}" height="{height*.13}" fill="{accent}" opacity="0.55"/><rect x="{width*.25}" y="{height*.62}" width="{width*.48}" height="{unit*.04}" rx="12" fill="#44403c" opacity="0.5"/>'
    buildings = "".join(f'<rect x="{width*(.13+i*.08)}" y="{height*(.22+(i%5)*.06)}" width="{width*.06}" height="{height*(.58-(i%5)*.06)}" fill="{[light, accent, "#cbd5e1"][i%3]}" opacity="0.86"/><path d="M{width*(.145+i*.08)} {height*(.30+(i%5)*.06)} h{width*.03} M{width*(.145+i*.08)} {height*(.40+(i%5)*.05)} h{width*.03}" stroke="#1f2937" stroke-width="{unit*.004}" opacity="0.35"/>' for i in range(9))
    return buildings + f'<path d="M{width*.08} {height*.82} H{width*.92}" stroke="{light}" stroke-width="{unit*.018}" opacity="0.6"/>'


def _animals_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key == "elephant":
        return f'<ellipse cx="{width*.46}" cy="{height*.52}" rx="{unit*.20}" ry="{unit*.15}" fill="{light}" filter="url(#softShadow)"/><circle cx="{width*.62}" cy="{height*.43}" r="{unit*.10}" fill="{light}"/><path d="M{width*.67} {height*.50} C{width*.75} {height*.60} {width*.68} {height*.72} {width*.58} {height*.66}" fill="none" stroke="{light}" stroke-width="{unit*.045}" stroke-linecap="round"/><circle cx="{width*.64}" cy="{height*.41}" r="{unit*.011}" fill="#111827"/>'
    if key == "dolphin":
        return f'<path d="M{width*.20} {height*.55} C{width*.38} {height*.32} {width*.68} {height*.34} {width*.82} {height*.52} C{width*.62} {height*.50} {width*.46} {height*.62} {width*.30} {height*.70} Z" fill="{light}" filter="url(#softShadow)"/><path d="M{width*.45} {height*.44} L{width*.38} {height*.25} L{width*.56} {height*.39} Z" fill="{accent}"/><path d="M0 {height*.76} C{width*.25} {height*.66} {width*.52} {height*.84} {width} {height*.68} V{height} H0 Z" fill="{accent}" opacity="0.35"/>'
    if key in {"parrot", "bird", "butterfly"}:
        return f'<ellipse cx="{width*.48}" cy="{height*.46}" rx="{unit*.12}" ry="{unit*.18}" fill="{accent}" filter="url(#softShadow)"/><circle cx="{width*.55}" cy="{height*.32}" r="{unit*.07}" fill="{light}"/><path d="M{width*.57} {height*.32} l{unit*.12} {unit*.04} l{-unit*.12} {unit*.04} z" fill="#f59e0b"/><path d="M{width*.38} {height*.48} C{width*.20} {height*.30} {width*.24} {height*.66} {width*.40} {height*.60}" fill="{light}" opacity="0.55"/>'
    ears = (
        f'<path d="M{width*.34} {height*.36} l{unit*.08} {-unit*.12} l{unit*.08} {unit*.12} z" fill="{accent}"/>'
        f'<path d="M{width*.58} {height*.36} l{unit*.08} {-unit*.12} l{unit*.08} {unit*.12} z" fill="{accent}"/>'
    )
    mane = f'<circle cx="{width*.50}" cy="{height*.48}" r="{unit*.20}" fill="{accent}" opacity="0.72" filter="url(#softShadow)"/>'
    face_color = light if key not in {"lion", "tiger"} else "#f59e0b"
    return f'{mane if key in {"lion", "tiger"} else ""}{ears}<circle cx="{width*.50}" cy="{height*.48}" r="{unit*.16}" fill="{face_color}" filter="url(#softShadow)"/><circle cx="{width*.44}" cy="{height*.46}" r="{unit*.018}" fill="#111827"/><circle cx="{width*.56}" cy="{height*.46}" r="{unit*.018}" fill="#111827"/><path d="M{width*.46} {height*.55} Q{width*.50} {height*.60} {width*.54} {height*.55}" fill="none" stroke="#111827" stroke-width="{unit*.012}" stroke-linecap="round"/><path d="M{width*.17} {height*.76} C{width*.36} {height*.66} {width*.62} {height*.84} {width*.84} {height*.70}" fill="none" stroke="{light}" stroke-width="{unit*.016}" opacity="0.45"/>'


def _people_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key in {"group", "family", "team", "workplace"}:
        people = "".join(f'<circle cx="{width*(.24+i*.13)}" cy="{height*(.30+(i%2)*.06)}" r="{unit*.045}" fill="{["#fde68a", "#fecaca", "#c7d2fe", "#fed7aa"][i%4]}"/><path d="M{width*(.20+i*.13)} {height*(.48+(i%2)*.03)} q{unit*.045} {-unit*.11} {unit*.09} 0 v{unit*.17} h{-unit*.18} z" fill="{[accent, light, "#38bdf8", "#fb7185"][i%4]}" opacity="0.86"/>' for i in range(5))
        return people + f'<rect x="{width*.14}" y="{height*.74}" width="{width*.72}" height="{unit*.035}" rx="16" fill="{light}" opacity="0.45"/>'
    return f'<circle cx="{width*.50}" cy="{height*.32}" r="{unit*.11}" fill="#fde68a" filter="url(#softShadow)"/><path d="M{width*.36} {height*.70} C{width*.38} {height*.52} {width*.44} {height*.45} {width*.50} {height*.45} C{width*.56} {height*.45} {width*.62} {height*.52} {width*.64} {height*.70} Z" fill="{accent}" filter="url(#softShadow)"/><path d="M{width*.40} {height*.36} C{width*.45} {height*.25} {width*.57} {height*.25} {width*.62} {height*.36}" fill="none" stroke="{light}" stroke-width="{unit*.02}" stroke-linecap="round" opacity="0.65"/>'


def _education_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key in {"classroom", "school", "whiteboard"}:
        desks = "".join(f'<rect x="{width*(.18+desk_index*.14)}" y="{height*.63}" width="{width*.09}" height="{height*.06}" rx="10" fill="{accent}" opacity="0.75"/>' for desk_index in range(5))
        board_lines = "".join(f'<rect x="{width*.30}" y="{height*(.29+line_index*.06)}" width="{width*(.18+line_index*.05)}" height="{unit*.012}" rx="5" fill="{accent}" opacity="0.75"/>' for line_index in range(4))
        return f'<rect x="{width*.18}" y="{height*.18}" width="{width*.64}" height="{height*.34}" rx="18" fill="{light}" opacity="0.86" filter="url(#softShadow)"/>{board_lines}{desks}<path d="M{width*.15} {height*.78} H{width*.85}" stroke="{light}" stroke-width="{unit*.018}" opacity="0.45"/>'
    if key in {"books", "library", "study-desk"}:
        books = "".join(f'<rect x="{width*(.25+book_index*.07)}" y="{height*(.34+(book_index%2)*.04)}" width="{width*.055}" height="{height*(.28+(book_index%3)*.03)}" rx="7" fill="{[accent, light, "#fbbf24", "#60a5fa"][book_index%4]}" filter="url(#softShadow)"/>' for book_index in range(7))
        return books + f'<rect x="{width*.20}" y="{height*.70}" width="{width*.60}" height="{unit*.04}" rx="14" fill="{light}" opacity="0.55"/>'
    return f'<circle cx="{width*.50}" cy="{height*.32}" r="{unit*.08}" fill="#fde68a" filter="url(#softShadow)"/><path d="M{width*.34} {height*.52} q{width*.16} {-height*.14} {width*.32} 0 v{height*.18} h{-width*.32} z" fill="{accent}"/><path d="M{width*.28} {height*.76} H{width*.72}" stroke="{light}" stroke-width="{unit*.026}" stroke-linecap="round"/><path d="M{width*.32} {height*.22} L{width*.50} {height*.15} L{width*.68} {height*.22} L{width*.50} {height*.30} Z" fill="{light}" opacity="0.9"/>'


def _healthcare_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    cross = f'<rect x="{width*.46}" y="{height*.24}" width="{width*.08}" height="{height*.30}" rx="10" fill="{accent}"/><rect x="{width*.35}" y="{height*.35}" width="{width*.30}" height="{height*.08}" rx="10" fill="{accent}"/>'
    if key in {"doctor", "nurse", "telehealth"}:
        return f'<circle cx="{width*.50}" cy="{height*.28}" r="{unit*.08}" fill="#fde68a" filter="url(#softShadow)"/><path d="M{width*.34} {height*.70} C{width*.36} {height*.50} {width*.44} {height*.42} {width*.50} {height*.42} C{width*.56} {height*.42} {width*.64} {height*.50} {width*.66} {height*.70} Z" fill="{light}"/>{cross}<path d="M{width*.37} {height*.45} C{width*.25} {height*.55} {width*.27} {height*.70} {width*.39} {height*.68}" fill="none" stroke="{accent}" stroke-width="{unit*.018}" stroke-linecap="round"/>'
    if key in {"stethoscope", "clinic", "hospital"}:
        return f'<rect x="{width*.18}" y="{height*.26}" width="{width*.64}" height="{height*.43}" rx="24" fill="{light}" opacity="0.86" filter="url(#softShadow)"/>{cross}<path d="M{width*.30} {height*.33} V{height*.48} C{width*.30} {height*.62} {width*.45} {height*.62} {width*.45} {height*.49}" fill="none" stroke="#0f172a" stroke-width="{unit*.018}" stroke-linecap="round"/><circle cx="{width*.55}" cy="{height*.51}" r="{unit*.045}" fill="none" stroke="#0f172a" stroke-width="{unit*.014}"/>'
    return f'<rect x="{width*.24}" y="{height*.34}" width="{width*.52}" height="{height*.24}" rx="28" fill="{light}" filter="url(#softShadow)"/>{cross}<circle cx="{width*.62}" cy="{height*.46}" r="{unit*.055}" fill="#ef4444" opacity="0.78"/><path d="M{width*.20} {height*.75} H{width*.80}" stroke="{light}" stroke-width="{unit*.018}" opacity="0.45"/>'


def _finance_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key in {"stock-chart", "analytics", "investment", "report"}:
        bars = "".join(f'<rect x="{width*(.22+bar_index*.085)}" y="{height*(.68-bar_index*.04)}" width="{width*.052}" height="{height*(.12+bar_index*.04)}" rx="8" fill="{[accent, light][bar_index%2]}"/>' for bar_index in range(6))
        return f'<rect x="{width*.15}" y="{height*.18}" width="{width*.70}" height="{height*.58}" rx="24" fill="#111827" opacity="0.78" filter="url(#softShadow)"/>{bars}<path d="M{width*.20} {height*.53} C{width*.34} {height*.42} {width*.47} {height*.48} {width*.60} {height*.32} S{width*.75} {height*.34} {width*.82} {height*.25}" fill="none" stroke="{accent}" stroke-width="{unit*.017}" stroke-linecap="round"/>'
    if key in {"credit-card", "banking", "wallet"}:
        return f'<rect x="{width*.22}" y="{height*.34}" width="{width*.56}" height="{height*.30}" rx="24" fill="{light}" filter="url(#softShadow)"/><rect x="{width*.22}" y="{height*.42}" width="{width*.56}" height="{height*.06}" fill="{accent}" opacity="0.85"/><rect x="{width*.30}" y="{height*.54}" width="{width*.16}" height="{unit*.025}" rx="8" fill="#0f172a" opacity="0.45"/><circle cx="{width*.65}" cy="{height*.56}" r="{unit*.035}" fill="{accent}" opacity="0.65"/>'
    coins = "".join(f'<ellipse cx="{width*(.36+coin_index*.055)}" cy="{height*(.64-coin_index*.035)}" rx="{unit*.08}" ry="{unit*.028}" fill="{[accent, light][coin_index%2]}" opacity="0.9"/>' for coin_index in range(6))
    return coins + f'<path d="M{width*.22} {height*.30} H{width*.78}" stroke="{light}" stroke-width="{unit*.016}" opacity="0.45"/>'


def _marketing_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key in {"megaphone", "campaign", "launch"}:
        return f'<path d="M{width*.26} {height*.45} L{width*.67} {height*.27} V{height*.65} L{width*.26} {height*.52} Z" fill="{light}" filter="url(#softShadow)"/><rect x="{width*.20}" y="{height*.43}" width="{width*.12}" height="{height*.13}" rx="12" fill="{accent}"/><path d="M{width*.37} {height*.54} l{width*.08} {height*.19}" stroke="{accent}" stroke-width="{unit*.025}" stroke-linecap="round"/><path d="M{width*.74} {height*.34} q{unit*.10} {unit*.08} 0 {unit*.18}" fill="none" stroke="{light}" stroke-width="{unit*.015}"/>'
    if key in {"brand-board", "content-calendar", "social-post", "email"}:
        cards = "".join(f'<rect x="{width*(.20+(card_index%2)*.31)}" y="{height*(.24+(card_index//2)*.20)}" width="{width*.24}" height="{height*.14}" rx="14" fill="{[light, accent, "#f59e0b", "#60a5fa"][card_index%4]}" opacity="0.85"/>' for card_index in range(4))
        return f'<rect x="{width*.14}" y="{height*.18}" width="{width*.72}" height="{height*.58}" rx="24" fill="#111827" opacity="0.52" filter="url(#softShadow)"/>{cards}'
    return f'<rect x="{width*.18}" y="{height*.20}" width="{width*.64}" height="{height*.50}" rx="24" fill="{light}" opacity="0.85" filter="url(#softShadow)"/><path d="M{width*.28} {height*.58} C{width*.42} {height*.48} {width*.48} {height*.52} {width*.62} {height*.34}" fill="none" stroke="{accent}" stroke-width="{unit*.018}"/><circle cx="{width*.67}" cy="{height*.31}" r="{unit*.05}" fill="{accent}"/>'


def _social_media_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    phone = f'<rect x="{width*.34}" y="{height*.18}" width="{width*.32}" height="{height*.60}" rx="30" fill="#111827" stroke="{light}" stroke-width="{unit*.012}" filter="url(#softShadow)"/><rect x="{width*.38}" y="{height*.27}" width="{width*.24}" height="{height*.36}" rx="16" fill="{accent}" opacity="0.72"/>'
    bubbles = "".join(f'<circle cx="{width*(.22+bubble_index*.13)}" cy="{height*(.27+(bubble_index%3)*.16)}" r="{unit*.045}" fill="{[light, accent, "#f472b6"][bubble_index%3]}" opacity="0.82"/>' for bubble_index in range(5))
    if key in {"creator-phone", "video-post", "story-template", "feed"}:
        return phone + f'<circle cx="{width*.50}" cy="{height*.68}" r="{unit*.015}" fill="{light}"/><path d="M{width*.46} {height*.39} l{unit*.10} {unit*.065} l{-unit*.10} {unit*.065} z" fill="#ffffff" opacity="0.9"/>'
    if key in {"likes", "comment-bubbles", "engagement", "hashtag"}:
        return phone + bubbles + f'<path d="M{width*.72} {height*.30} c{unit*.04} {-unit*.05} {unit*.12} 0 {unit*.08} {unit*.08} l{-unit*.08} {unit*.10} l{-unit*.08} {-unit*.10} c{-unit*.04} {-unit*.08} {unit*.04} {-unit*.13} {unit*.08} {-unit*.08}z" fill="#ef4444"/>'
    return phone + f'<circle cx="{width*.23}" cy="{height*.36}" r="{unit*.08}" fill="{light}"/><circle cx="{width*.77}" cy="{height*.56}" r="{unit*.07}" fill="{accent}"/>'


def _events_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key in {"conference", "stage", "concert", "podium"}:
        beams = "".join(f'<path d="M{width*(.24+beam_index*.18)} {height*.18} L{width*.50} {height*.70}" stroke="{[accent, light][beam_index%2]}" stroke-width="{unit*.018}" opacity="0.55"/>' for beam_index in range(4))
        return beams + f'<rect x="{width*.18}" y="{height*.66}" width="{width*.64}" height="{height*.10}" rx="18" fill="{light}" filter="url(#softShadow)"/><rect x="{width*.43}" y="{height*.45}" width="{width*.14}" height="{height*.22}" rx="10" fill="{accent}"/>'
    if key in {"tickets", "invitation", "calendar"}:
        return f'<rect x="{width*.24}" y="{height*.28}" width="{width*.52}" height="{height*.30}" rx="20" fill="{light}" filter="url(#softShadow)"/><circle cx="{width*.24}" cy="{height*.43}" r="{unit*.045}" fill="#111827"/><circle cx="{width*.76}" cy="{height*.43}" r="{unit*.045}" fill="#111827"/><path d="M{width*.38} {height*.32} V{height*.55}" stroke="{accent}" stroke-width="{unit*.012}" stroke-dasharray="10 12"/><rect x="{width*.45}" y="{height*.37}" width="{width*.20}" height="{unit*.035}" rx="8" fill="{accent}"/>'
    confetti = "".join(f'<circle cx="{width*(.18+(confetti_index*17%68)/100)}" cy="{height*(.18+(confetti_index*23%55)/100)}" r="{unit*.018}" fill="{[accent, light, "#f59e0b", "#f472b6"][confetti_index%4]}"/>' for confetti_index in range(18))
    return confetti + f'<path d="M{width*.22} {height*.68} C{width*.38} {height*.54} {width*.60} {height*.78} {width*.80} {height*.58}" fill="none" stroke="{light}" stroke-width="{unit*.025}"/>'


def _sports_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key in {"basketball", "football", "tennis"}:
        ball_color = "#f97316" if key == "basketball" else light
        ball = f'<circle cx="{width*.50}" cy="{height*.45}" r="{unit*.15}" fill="{ball_color}" filter="url(#softShadow)"/><path d="M{width*.35} {height*.45} H{width*.65} M{width*.50} {height*.30} V{height*.60}" stroke="{accent}" stroke-width="{unit*.012}" opacity="0.85"/>'
        return ball + f'<path d="M{width*.18} {height*.75} C{width*.36} {height*.66} {width*.62} {height*.84} {width*.84} {height*.70}" fill="none" stroke="{light}" stroke-width="{unit*.018}" opacity="0.5"/>'
    if key in {"running-track", "training", "fitness-field", "team"}:
        return f'<circle cx="{width*.45}" cy="{height*.24}" r="{unit*.045}" fill="{light}"/><path d="M{width*.45} {height*.31} L{width*.55} {height*.48} L{width*.69} {height*.58}" fill="none" stroke="{accent}" stroke-width="{unit*.030}" stroke-linecap="round"/><path d="M{width*.50} {height*.40} L{width*.34} {height*.55} M{width*.55} {height*.48} L{width*.43} {height*.72}" fill="none" stroke="{light}" stroke-width="{unit*.026}" stroke-linecap="round"/><ellipse cx="{width*.50}" cy="{height*.78}" rx="{width*.36}" ry="{height*.08}" fill="none" stroke="{light}" stroke-width="{unit*.014}" opacity="0.55"/>'
    return f'<path d="M{width*.50} {height*.22} L{width*.58} {height*.42} L{width*.80} {height*.42} L{width*.62} {height*.55} L{width*.70} {height*.76} L{width*.50} {height*.63} L{width*.30} {height*.76} L{width*.38} {height*.55} L{width*.20} {height*.42} L{width*.42} {height*.42} Z" fill="{accent}" filter="url(#softShadow)"/><rect x="{width*.25}" y="{height*.78}" width="{width*.50}" height="{unit*.035}" rx="14" fill="{light}" opacity="0.48"/>'


def _music_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key in {"guitar", "violin"}:
        return f'<ellipse cx="{width*.42}" cy="{height*.58}" rx="{unit*.12}" ry="{unit*.17}" fill="{accent}" filter="url(#softShadow)"/><ellipse cx="{width*.52}" cy="{height*.45}" rx="{unit*.09}" ry="{unit*.12}" fill="{accent}"/><rect x="{width*.55}" y="{height*.22}" width="{unit*.035}" height="{height*.34}" rx="8" fill="{light}" transform="rotate(-22 {width*.57} {height*.38})"/><circle cx="{width*.46}" cy="{height*.54}" r="{unit*.035}" fill="#111827" opacity="0.7"/>'
    if key in {"microphone", "studio", "concert-stage"}:
        return f'<rect x="{width*.44}" y="{height*.24}" width="{width*.12}" height="{height*.24}" rx="{unit*.06}" fill="{light}" filter="url(#softShadow)"/><path d="M{width*.36} {height*.42} C{width*.36} {height*.58} {width*.64} {height*.58} {width*.64} {height*.42}" fill="none" stroke="{accent}" stroke-width="{unit*.022}"/><path d="M{width*.50} {height*.58} V{height*.74} M{width*.36} {height*.74} H{width*.64}" stroke="{light}" stroke-width="{unit*.018}" stroke-linecap="round"/>'
    if key in {"piano", "headphones", "speaker"}:
        keys = "".join(f'<rect x="{width*(.25+key_index*.055)}" y="{height*.55}" width="{width*.045}" height="{height*.16}" fill="{[light, "#111827"][key_index%2]}" opacity="0.9"/>' for key_index in range(9))
        return f'<rect x="{width*.20}" y="{height*.42}" width="{width*.60}" height="{height*.30}" rx="18" fill="{accent}" filter="url(#softShadow)"/>{keys}<path d="M{width*.35} {height*.36} C{width*.35} {height*.20} {width*.65} {height*.20} {width*.65} {height*.36}" fill="none" stroke="{light}" stroke-width="{unit*.022}"/>'
    notes = "".join(f'<path d="M{width*(.32+note_index*.12)} {height*.30} V{height*(.55+(note_index%2)*.05)}" stroke="{light}" stroke-width="{unit*.015}"/><circle cx="{width*(.30+note_index*.12)}" cy="{height*(.58+(note_index%2)*.05)}" r="{unit*.04}" fill="{accent}"/>' for note_index in range(4))
    return notes + f'<path d="M{width*.20} {height*.78} H{width*.80}" stroke="{light}" stroke-width="{unit*.018}" opacity="0.45"/>'


def _minimal_scene(key: str, width: int, height: int, accent: str, light: str, seed: int) -> str:
    unit = min(width, height)
    if key in {"plant", "vase"}:
        return f'<rect x="{width*.44}" y="{height*.58}" width="{width*.13}" height="{height*.13}" rx="{unit*.035}" fill="{accent}" filter="url(#softShadow)"/><path d="M{width*.50} {height*.58} C{width*.39} {height*.42} {width*.35} {height*.32} {width*.27} {height*.29}" fill="none" stroke="#166534" stroke-width="{unit*.016}" stroke-linecap="round"/><ellipse cx="{width*.31}" cy="{height*.30}" rx="{unit*.055}" ry="{unit*.03}" fill="#22c55e" transform="rotate(-26 {width*.31} {height*.30})"/><ellipse cx="{width*.55}" cy="{height*.38}" rx="{unit*.05}" ry="{unit*.028}" fill="#84cc16" transform="rotate(28 {width*.55} {height*.38})"/><rect x="{width*.18}" y="{height*.78}" width="{width*.64}" height="{unit*.024}" rx="12" fill="{accent}" opacity="0.35"/>'
    if key == "stones":
        return f'<ellipse cx="{width*.50}" cy="{height*.68}" rx="{unit*.19}" ry="{unit*.055}" fill="#78716c" filter="url(#softShadow)"/><ellipse cx="{width*.50}" cy="{height*.56}" rx="{unit*.14}" ry="{unit*.047}" fill="#a8a29e"/><ellipse cx="{width*.50}" cy="{height*.46}" rx="{unit*.10}" ry="{unit*.038}" fill="#d6d3d1"/><circle cx="{width*.68}" cy="{height*.30}" r="{unit*.04}" fill="{accent}" opacity="0.35"/>'
    if key in {"frame", "paper", "book"}:
        return f'<rect x="{width*.30}" y="{height*.22}" width="{width*.40}" height="{height*.42}" rx="8" fill="{light}" stroke="{accent}" stroke-width="{unit*.018}" filter="url(#softShadow)"/><rect x="{width*.36}" y="{height*.31}" width="{width*.28}" height="{height*.22}" fill="#ffffff" opacity="0.82"/><rect x="{width*.22}" y="{height*.76}" width="{width*.56}" height="{unit*.025}" rx="12" fill="{accent}" opacity="0.32"/>'
    return f'<rect x="{width*.28}" y="{height*.46}" width="{width*.44}" height="{height*.16}" rx="{unit*.035}" fill="{light}" filter="url(#softShadow)"/><circle cx="{width*.38}" cy="{height*.36}" r="{unit*.07}" fill="{accent}" opacity="0.58"/><rect x="{width*.54}" y="{height*.28}" width="{width*.16}" height="{height*.20}" rx="{unit*.025}" fill="{accent}" opacity="0.45"/><rect x="{width*.20}" y="{height*.74}" width="{width*.60}" height="{unit*.026}" rx="12" fill="{accent}" opacity="0.28"/>'
