from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, Product, User, LoyaltyAccount, Order, OrderItem
import json

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///studynest.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key'

db.init_app(app)

def get_current_user():
    if 'user_id' not in session:
        return None
    return User.query.get(session['user_id'])

def require_admin():
    current_user = get_current_user()
    if not current_user:
        flash('Please log in first.')
        return None, redirect(url_for('home'))
    if current_user.role != 'admin':
        flash('Access denied. Admin only.')
        return None, redirect(url_for('home'))
    return current_user, None

@app.route('/')
def home():
    products = Product.query.filter_by(is_available=True).all()
    current_user = get_current_user()
    user_orders = []

    if current_user:
        user_orders = (
            Order.query
            .filter_by(user_id=current_user.id)
            .order_by(Order.created_at.desc())
            .all()
        )

    return render_template(
        'index.html',
        products=products,
        current_user=current_user,
        user_orders=user_orders
    )

@app.route('/test-db')
def test_db():
    count = Product.query.count()
    return f"Database is working. Product count: {count}"

@app.route('/test-orders')
def test_orders():
    orders = Order.query.all()
    return f"Total orders: {len(orders)}"

@app.route('/register', methods=['POST'])
def register():
    email = request.form.get('email', '').strip().lower()
    password = request.form.get('password', '')

    if not email or not password:
        flash('Please enter both email and password.')
        return redirect(url_for('home'))

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        flash('This email is already registered.')
        return redirect(url_for('home'))

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
    role = 'admin' if User.query.count() == 0 else 'customer'

    new_user = User(
        email=email,
        password_hash=hashed_password,
        role=role
    )
    db.session.add(new_user)
    db.session.commit()

    loyalty_account = LoyaltyAccount(user_id=new_user.id, points_balance=0)
    db.session.add(loyalty_account)
    db.session.commit()

    if role == 'admin':
        flash('Registration successful. This account has been created as ADMIN.')
    else:
        flash('Registration successful. Please log in.')

    return redirect(url_for('home'))

@app.route('/login', methods=['POST'])
def login():
    email = request.form.get('email', '').strip().lower()
    password = request.form.get('password', '')

    user = User.query.filter_by(email=email).first()

    if user and check_password_hash(user.password_hash, password):
        session['user_id'] = user.id
        flash('Login successful.')
    else:
        flash('Invalid email or password.')

    return redirect(url_for('home'))

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    flash('You have logged out.')
    return redirect(url_for('home'))

@app.route('/create-order', methods=['POST'])
def create_order():
    current_user = get_current_user()
    if not current_user:
        return jsonify({'success': False, 'message': 'Please log in first.'}), 401

    data = request.get_json() or {}

    items = data.get('items', [])
    subtotal = float(data.get('subtotal', 0))
    discount = float(data.get('discount', 0))
    total = float(data.get('total', 0))
    payment_method = data.get('payment_method', 'cash')
    order_type = data.get('order_type', 'dine-in')
    pickup_time = data.get('pickup_time', 'ASAP')
    note = data.get('note', '')

    if not items:
        return jsonify({'success': False, 'message': 'Cart is empty.'}), 400

    if payment_method not in ['cash', 'card']:
        return jsonify({'success': False, 'message': 'Invalid payment method.'}), 400

    payment_status = 'paid' if payment_method == 'card' else 'unpaid'

    try:
        new_order = Order(
            user_id=current_user.id,
            subtotal=subtotal,
            discount=discount,
            total=total,
            payment_method=payment_method,
            payment_status=payment_status,
            order_status='pending'
        )
        db.session.add(new_order)
        db.session.commit()

        for item in items:
            order_item = OrderItem(
                order_id=new_order.id,
                product_id=int(item.get('product_id', 1)),
                quantity=int(item.get('qty', 1)),
                item_name_snapshot=item.get('name', 'Unknown item'),
                item_price_snapshot=float(item.get('price', 0)),
                customisation_json=json.dumps(item.get('customisation', {}))
            )
            db.session.add(order_item)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Order created successfully.',
            'order_id': new_order.id,
            'payment_method': payment_method,
            'payment_status': payment_status,
            'order_type': order_type,
            'pickup_time': pickup_time,
            'note': note
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/set-admin/<path:email>')
def set_admin(email):
    email = email.strip().lower()
    user = User.query.filter_by(email=email).first()

    if not user:
        return f"User not found: {email}"

    user.role = 'admin'
    db.session.commit()

    return f"{email} is now an admin."

@app.route('/admin/orders')
def admin_orders():
    current_user, redirect_response = require_admin()
    if redirect_response:
        return redirect_response

    orders = Order.query.order_by(Order.created_at.desc()).all()
    return render_template(
        'admin_orders.html',
        current_user=current_user,
        orders=orders
    )

@app.route('/admin/orders/<int:order_id>/status', methods=['POST'])
def update_order_status(order_id):
    current_user, redirect_response = require_admin()
    if redirect_response:
        return redirect_response

    order = Order.query.get_or_404(order_id)
    new_status = request.form.get('order_status')

    allowed_statuses = ['pending', 'preparing', 'ready', 'completed']
    if new_status not in allowed_statuses:
        flash('Invalid status.')
        return redirect(url_for('admin_orders'))

    order.order_status = new_status
    db.session.commit()

    flash(f'Order #{order.id} status updated to {new_status}.')
    return redirect(url_for('admin_orders'))

@app.route('/admin/products')
def admin_products():
    current_user, redirect_response = require_admin()
    if redirect_response:
        return redirect_response

    products = Product.query.order_by(Product.category.asc(), Product.name.asc()).all()
    return render_template(
        'admin_products.html',
        current_user=current_user,
        products=products,
        edit_product=None
    )

@app.route('/admin/products/new', methods=['POST'])
def create_product():
    current_user, redirect_response = require_admin()
    if redirect_response:
        return redirect_response

    name = request.form.get('name', '').strip()
    category = request.form.get('category', '').strip().lower()
    description = request.form.get('description', '').strip()
    price_raw = request.form.get('price', '').strip()
    image_url = request.form.get('image_url', '').strip()
    is_available = request.form.get('is_available') == 'on'

    if not name or not category or not price_raw:
        flash('Name, category, and price are required.')
        return redirect(url_for('admin_products'))

    try:
        price = float(price_raw)
    except ValueError:
        flash('Price must be a valid number.')
        return redirect(url_for('admin_products'))

    new_product = Product(
        name=name,
        category=category,
        description=description,
        price=price,
        image_url=image_url,
        is_available=is_available
    )
    db.session.add(new_product)
    db.session.commit()

    flash(f'Product "{name}" created successfully.')
    return redirect(url_for('admin_products'))

@app.route('/admin/products/<int:product_id>/edit')
def edit_product_page(product_id):
    current_user, redirect_response = require_admin()
    if redirect_response:
        return redirect_response

    products = Product.query.order_by(Product.category.asc(), Product.name.asc()).all()
    edit_product = Product.query.get_or_404(product_id)

    return render_template(
        'admin_products.html',
        current_user=current_user,
        products=products,
        edit_product=edit_product
    )

@app.route('/admin/products/<int:product_id>/update', methods=['POST'])
def update_product(product_id):
    current_user, redirect_response = require_admin()
    if redirect_response:
        return redirect_response

    product = Product.query.get_or_404(product_id)

    name = request.form.get('name', '').strip()
    category = request.form.get('category', '').strip().lower()
    description = request.form.get('description', '').strip()
    price_raw = request.form.get('price', '').strip()
    image_url = request.form.get('image_url', '').strip()
    is_available = request.form.get('is_available') == 'on'

    if not name or not category or not price_raw:
        flash('Name, category, and price are required.')
        return redirect(url_for('edit_product_page', product_id=product.id))

    try:
        price = float(price_raw)
    except ValueError:
        flash('Price must be a valid number.')
        return redirect(url_for('edit_product_page', product_id=product.id))

    product.name = name
    product.category = category
    product.description = description
    product.price = price
    product.image_url = image_url
    product.is_available = is_available

    db.session.commit()

    flash(f'Product "{product.name}" updated successfully.')
    return redirect(url_for('admin_products'))

@app.route('/admin/products/<int:product_id>/delete', methods=['POST'])
def delete_product(product_id):
    current_user, redirect_response = require_admin()
    if redirect_response:
        return redirect_response

    product = Product.query.get_or_404(product_id)
    product_name = product.name

    db.session.delete(product)
    db.session.commit()

    flash(f'Product "{product_name}" deleted successfully.')
    return redirect(url_for('admin_products'))

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)