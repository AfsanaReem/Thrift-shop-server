const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SK);
require('dotenv').config();
//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.khy11rb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access')
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        return next();
    })
}

async function run() {
    try {
        const usersCollection = client.db('thriftShopDb').collection('users')
        const productsCollection = client.db('thriftShopDb').collection('products')
        const bookingsCollection = client.db('thriftShopDb').collection('bookings')
        const paymentsCollection = client.db('thriftShopDb').collection('payments')

        //Note: use verifyAdmin after verifyJWT
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await usersCollection.findOne(query);
            if (user.role !== 'Admin') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }
        //Note: use verifySeller after verifyJWT
        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await usersCollection.findOne(query);
            if (user.role !== 'Seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '3h' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })
        })

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email }
            const option = { upsert: true }
            const updatedDoc = {
                $set: user
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send(result)
        })

        app.get('/users/buyer', verifyJWT, verifyAdmin, async (req, res) => {
            const query = { role: 'Buyer' }
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/users/seller', verifyJWT, verifyAdmin, async (req, res) => {
            const query = { role: 'Seller' }
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'Admin' });
        })

        app.get('/users/seller/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            res.send({ isSeller: user?.role === 'Seller' });
        })

        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            res.send({ isBuyer: user?.role === 'Buyer' });
        })

        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        app.post('/products', verifyJWT, async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        })

        app.get('/products/reported', verifyJWT, async (req, res) => {
            const query = { reported: true }
            const result = await productsCollection.find(query).toArray();
            res.send(result)
        })

        app.post('/bookings', verifyJWT, async (req, res) => {
            const product = req.body;
            const result = await bookingsCollection.insertOne(product);
            res.send(result);
        })

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bookingsCollection.findOne(query);
            res.send(result);
        })

        app.get('/products', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/products/advertised', async (req, res) => {
            const query = { advertised: true, sold: false, paid: false }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/products/mens', async (req, res) => {
            const query = { category: 'Men' }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/products/womens', async (req, res) => {
            const query = { category: 'Women' }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/products/kids', async (req, res) => {
            const query = { category: 'Kids' }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        app.delete('/products/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result);
        })

        app.delete('/bookings/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await bookingsCollection.deleteOne(filter);
            res.send(result);
        })

        app.put('/products/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const option = { upsert: true }
            const updatedDoc = {
                $set: {
                    advertised: true
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
        })

        app.put('/users/verify/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const option = { upsert: true }
            const updatedDoc = {
                $set: {
                    verified: true
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
        })

        app.put('/products/sold/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const option = { upsert: true }
            const updatedDoc = {
                $set: {
                    sold: true
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
        })

        app.put('/products/report/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const option = { upsert: true }
            const updatedDoc = {
                $set: {
                    reported: true
                }
            }
            const result = await productsCollection.updateOne(filter, updatedDoc, option);
            res.send(result);
        })

        //stripe
        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntent.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        })

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = { _id: ObjectId(id) }
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const paidResult = await bookingsCollection.updateOne(filter, updatedDoc)
            res.send(result);
        })


    }
    finally {

    }

}
run().catch(console.log);
app.get('/', (req, res) => {
    res.send('server is running')
})
app.listen(port, () => console.log(port));
