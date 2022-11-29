const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const stripe = require("stripe")(process.env.STRIPE_SK);
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

        app.get('/users', async (req, res) => {
            const query = {};
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })
        app.get('/users/buyer', async (req, res) => {
            const query = { role: 'Buyer' }
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })
        app.get('/users/seller', async (req, res) => {
            const query = { role: 'Seller' }
            const result = await usersCollection.find(query).toArray();
            res.send(result)
        })

        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result);
        })

        app.get('/products', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/products/advertised', async (req, res) => {
            const query = { advertised: true }
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

        app.delete('/products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result);
        })

        app.put('/products/:id', verifyJWT, async (req, res) => {
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


    }
    finally {

    }

}
run().catch(console.log);
app.get('/', (req, res) => {
    res.send('server is running')
})
app.listen(port, () => console.log(port));
