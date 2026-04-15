from app import app
from models import db, Product

products = [
    {
        "name": "Americano",
        "category": "coffee",
        "description": "Smooth espresso diluted with hot water.",
        "price": 2.60,
        "image_url": "images/americano.jpg"
    },
    {
        "name": "Espresso",
        "category": "coffee",
        "description": "A short, intense shot of coffee.",
        "price": 2.20,
        "image_url": "images/espresso.jpg"
    },
    {
        "name": "Cappuccino",
        "category": "coffee",
        "description": "Espresso with steamed milk and foam.",
        "price": 3.20,
        "image_url": "images/cappuccino.jpg"
    },
    {
        "name": "Caffè Latte",
        "category": "coffee",
        "description": "Milky coffee, gentle and creamy.",
        "price": 3.40,
        "image_url": "images/caffe-latte.jpg"
    },
    {
        "name": "Flat White",
        "category": "coffee",
        "description": "Velvety microfoam over a double shot.",
        "price": 3.50,
        "image_url": "images/flat-white.jpg"
    },
    {
        "name": "Macchiato",
        "category": "coffee",
        "description": "Espresso marked with a drop of milk.",
        "price": 2.80,
        "image_url": "images/macchiato.jpg"
    },
    {
        "name": "Jasmine Green Tea",
        "category": "tea",
        "description": "Light green tea scented with jasmine flowers.",
        "price": 2.80,
        "image_url": "images/jasmine-green-tea.jpg"
    },
    {
        "name": "Japanese Matcha",
        "category": "tea",
        "description": "Whisked matcha with a rich umami flavour.",
        "price": 3.20,
        "image_url": "images/japanese-matcha.jpg"
    },
    {
        "name": "Earl Grey Tea",
        "category": "tea",
        "description": "Black tea with a hint of bergamot.",
        "price": 2.70,
        "image_url": "images/earl-grey-tea.jpg"
    },
    {
        "name": "Cheesecake",
        "category": "dessert",
        "description": "Classic baked cheesecake with biscuit base.",
        "price": 4.20,
        "image_url": "images/cheesecake.jpg"
    },
    {
        "name": "Chocolate Brownie",
        "category": "dessert",
        "description": "Rich chocolate brownie, slightly fudgy inside.",
        "price": 2.90,
        "image_url": "images/brownie.jpg"
    },
    {
        "name": "Cookies",
        "category": "dessert",
        "description": "Freshly baked cookies with chocolate chips.",
        "price": 2.20,
        "image_url": "images/cookies.jpg"
    },
    {
        "name": "Donut",
        "category": "dessert",
        "description": "Soft donut with sugar glaze.",
        "price": 2.40,
        "image_url": "images/donut.jpg"
    },
    {
        "name": "Egg Tart",
        "category": "dessert",
        "description": "Crispy tart shell with smooth egg custard.",
        "price": 2.50,
        "image_url": "images/egg-tart.jpg"
    },
    {
        "name": "Croissant",
        "category": "dessert",
        "description": "Buttery and flaky French pastry.",
        "price": 2.60,
        "image_url": "images/croissant.jpg"
    },
    {
        "name": "Scone",
        "category": "dessert",
        "description": "Served with cream and jam.",
        "price": 2.80,
        "image_url": "images/scone.jpg"
    },
    {
        "name": "Tiramisu",
        "category": "dessert",
        "description": "Coffee-flavoured Italian dessert.",
        "price": 4.50,
        "image_url": "images/tiramisu.jpg"
    },
    {
        "name": "Waffle",
        "category": "dessert",
        "description": "Crispy waffle with syrup.",
        "price": 3.80,
        "image_url": "images/waffle.jpg"
    }
]

with app.app_context():
    Product.query.delete()

    for item in products:
        product = Product(
            name=item["name"],
            category=item["category"],
            description=item["description"],
            price=item["price"],
            image_url=item["image_url"]
        )
        db.session.add(product)

    db.session.commit()
    print("Seeded products successfully!")