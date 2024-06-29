const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const SSLCommerzPayment = require("sslcommerz-lts");
// const cookieParser=require('cookie-parser')
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// ==========middleware==========
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://computer-accessories-shop-frontend.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u9t7oll.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@cluster0.mjmr8hf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// ssl commerz cresentials
const store_id = process.env.storeID;
const store_passwd = process.env.storePasswd;
const is_live = false; //true for live, false for sandbox

async function run() {
  try {
    // collections
    const products = client.db("XYZ").collection("products");
    const cart = client.db("XYZ").collection("cart");
    const orders = client.db("XYZ").collection("orders");
    const wishlist = client.db("XYZ").collection("wishlist");
    const users = client.db("XYZ").collection("users");
    const reviews = client.db("XYZ").collection("reviews");
    const payments = client.db("XYZ").collection("payments");
    const offers = client.db("XYZ").collection("offers");
    const appointments = client.db("XYZ").collection("appointments");

    // security
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send(token);
    });

    const verifyToken = (req, res, next) => {
      // console.log("inside VF",req.headers)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Access Denied" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Access Denied" });
        }
        req.decoded = decoded;
        next();
      });
    };
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await users.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(401).send({ message: "forbidden access" });
      }
      next();
    };

    // post method for products
    app.post("/api/v1/products", async (req, res) => {
      const test = req.body;
      const result = await products.insertOne(test);
      res.send(result);
    });
    app.post("/api/v1/cart", async (req, res) => {
      const item = req.body;
      console.log(item);
      const product = {
        id: item._id,
        name: item.name,
        brand: item.brand,
        model: item.model,
        price: item.price,
        discount_price: item.discount_price,
        stock: item.stock,
        rating: item.rating,
        reviews: item.reviews,
        description: item.description,
        category: item.category,
        tag: item.tag,
        images: item.images,
        email: item.email,
        warranty: item.warranty,
      };

      const query = { id: item._id, email: item.email };
      const isExist = await cart.findOne(query);
      if (isExist) {
        return res.send({ message: "already exists" });
      }

      const result = await cart.insertOne(product);
      res.send(result);
    });
    app.post("/api/v1/wishlist", async (req, res) => {
      const item = req.body;
      const product = {
        id: item._id,
        name: item.name,
        brand: item.brand,
        model: item.model,
        price: item.price,
        discount_price: item.discount_price,
        stock: item.stock,
        rating: item.rating,
        reviews: item.reviews,
        description: item.description,
        category: item.category,
        tag: item.tag,
        images: item.images,
        email: item.email,
      };
      const query = { id: item._id, email: item.email };
      const isExist = await wishlist.findOne(query);
      if (isExist) {
        return res.send({ message: "already exists" });
      }
      const result = await wishlist.insertOne(product);
      res.send(result);
    });
    app.post("/api/v1/orders", async (req, res) => {
      const test = req.body;
      const result = await orders.insertOne(test);
      res.send(result);
    });

    // -----

    app.post("/api/v1/payment", async (req, res) => {
      const tran_id = new ObjectId().toString();
      const id = new ObjectId().toString();

      const cartItem = req.body;
      const info = {
        ...cartItem,
        code: id,
      };
      const result = await orders.insertOne(info);

      const data = {
        total_amount: cartItem?.total_bill,
        currency: "BDT",
        tran_id: tran_id,
        success_url: `http://localhost:5000/api/v1/user/payment/success/${tran_id}?code=${id}`,
        fail_url: `http://localhost:5000/api/v1/user/payment/fail/${tran_id}?code=${id}`,
        cancel_url: "http://localhost:3030/cancel",
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: "combine food",
        product_category: "Mix category",
        product_profile: "general",
        cus_name: cartItem?.userName,
        cus_email: cartItem?.userEmail,
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });
        console.log("Redirecting to: ", GatewayPageURL);
      });

      app.post("/api/v1/user/payment/success/:tranId", async (req, res) => {
        const result = await orders.updateOne(
          { code: req.query.code },
          {
            $set: {
              payment: "complete",
              transactionId: req.params.tranId,
            },
          }
        );
        if (result.modifiedCount > 0) {
          res.redirect(
            `http://localhost:5173/api/v1/payment-complete/${req.params.tranId}`
          );
        }

        const cartIds = await cart.find().toArray();
        const ids = cartIds.map((x) => x._id);
        const query = { _id: { $in: ids } };
        await cart.deleteMany(query);
      });
      app.post("/api/v1/user/payment/fail/:tranId", async (req, res) => {
        const result = await orders.updateOne(
          { code: req.query.code },
          {
            $set: {
              payment: "failed",
              // transactionId: req.params.tranId
            },
          }
        );
        if (result.modifiedCount > 0) {
          res.redirect(
            `http://localhost:5173/api/v1/payment-failed/${req.params.tranId}`
          );
        }
      });
    });
    // ----
    app.post("/api/v1/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existing = await users.findOne(query);
      if (existing) {
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await users.insertOne(user);
      res.send(result);
    });
    app.post("/api/v1/reviews", async (req, res) => {
      const test = req.body;
      const result = await reviews.insertOne(test);
      res.send(result);
    });
    app.post("/api/v1/appointments", async (req, res) => {
      const test = req.body;
      const result = await appointments.insertOne(test);
      res.send(result);
    });

    // delete methods
    app.delete("/api/v1/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await users.deleteOne(query);
      res.send(result);
    });
    app.delete("/api/v1/admin/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await products.deleteOne(query);
      res.send(result);
    });
    app.delete("/api/v1/cart/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await cart.deleteOne(query);
      res.send(result);
    });
    app.delete("/api/v1/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlist.deleteOne(query);
      res.send(result);
    });
    app.delete("/api/v1/users/order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await orders.deleteOne(query);
      res.send(result);
    });
    app.delete("/api/v1/admin/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reviews.deleteOne(query);
      res.send(result);
    });

    // update methods
    app.patch("/api/v1/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await users.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.patch("/api/v1/users/updateProfile/:email", async (req, res) => {
      const email = req.params.email;
      const data = req.body;
      const filter = { email: email };
      const updatedDoc = {
        $set: {
          name: data?.name,
          email: data?.email,
          phone: data?.phone,
          image: data?.image,
          address: data?.address,
        },
      };
      const result = await users.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.patch("/api/v1/admin/products/:id", async (req, res) => {
      const id = req.params.id;
      const product = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: product.name,
          brand: product.brand,
          model: product.model,
          price: product.price,
          discount_price: product.discount_price,
          stock: product.stock,
          rating: product.rating,
          reviews: product.reviews,
          description: product.description,
          category: product.category,
          tag: product.tag,
          images: product.images,
        },
      };
      const result = await products.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.patch("/api/v1/offers-text", async (req, res) => {
      const data = req.body;
      const filter = { _id: new ObjectId("66472aa6d941e3ad30045c8a") };
      const updatedDoc = {
        $set: {
          title: data.title,
          percentage: data.percentage,
          days: data.days,
          hours: data.hours,
          minutes: data.minutes,
          seconds: data.seconds,
          display: data.display
          // products:data.products,
          // category:data.category,
        },
      };
      const result = await offers.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.patch("/api/v1/offers-products", async (req, res) => {
      const data = req.body;
      const filter = { _id: new ObjectId("66472aa6d941e3ad30045c8a") };
      const updatedDoc = {
        $set: {
          products: data.products,
        },
      };
      const result = await offers.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // get methods
    app.get("/api/v1/products", async (req, res) => {
      let queryObj = {};
      let sortObj = {};
      const category = req.query.category;
      const brand = req.query.brand;
      const sortField = req.query.sortField;
      const sortOrder = req.query.sortOrder;
      const page = Number(req.query.page);
      const limit = Number(req.query.limit);
      const skip = (page - 1) * limit;
      const productName = req.query.productName;
      // console.log(category, sortField, sortOrder,productName, limit,skip)
      if (category) {
        queryObj.category = category;
      }
      if (brand) {
        queryObj.brand = brand;
      }
      if (sortField && sortOrder) {
        if (sortOrder == "rating") {
          sortObj["rating"] = "desc";
        } else {
          sortObj[sortField] = sortOrder;
        }
      }
      if (productName) {
        const searchTerm = new RegExp(productName, "i"); // 'i' for case-insensitive search
        queryObj.name = searchTerm;
      }
      const result = await products
        .find(queryObj)
        .skip(skip)
        .limit(limit)
        .sort(sortObj)
        .toArray();
      const count = await products.estimatedDocumentCount();
      res.send({ result, count });
    });

    app.get("/api/v1/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await products.findOne(query);
      res.send(result);
    });
    app.get("/api/v1/users", async (req, res) => {
      const result = await users.find().toArray();
      res.send(result);
    });
    app.get("/api/v1/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await users.findOne(query);
      res.send(result);
    });
    app.get("/api/v1/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        email: email,
        role: "admin",
      };
      const result = await users.findOne(query);
      //console.log(result);
      if (result) {
        res.send({ admin: true });
      } else {
        res.send({ admin: false });
      }
      // res.send(result);
    });

    app.get("/api/v1/cart/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await cart.find(query).toArray();
      res.send(result);
    });
    app.get("/api/v1/wishlist/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await wishlist.find(query).toArray();
      res.send(result);
    });
    app.get("/api/v1/orders", async (req, res) => {
      const result = await orders.find().toArray();
      res.send(result);
    });
    app.get("/api/v1/orders/:email", async (req, res) => {
      const email = req.params.email;
      const query = {
        userEmail: email,
      };
      const result = await orders.find(query).toArray();
      res.send(result);
    });
    app.get("/api/v1/reviews", async (req, res) => {
      const result = await reviews.find().toArray();
      res.send(result);
    });
    app.get("/api/v1/reviews/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await reviews.find(query).toArray();
      res.send(result);
    });

    app.get("/api/v1/single/reviews/:id", async (req, res) => {
      const id = req.params.id;
      const query = { productId: id };
      const result = await reviews.find(query).toArray();
      res.send(result);
    });
    app.get("/api/v1/payments", async (req, res) => {
      const result = await payments.find().toArray();
      res.send(result);
    });
    app.get("/api/v1/payments/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await payments.find(query).toArray();
      res.send(result);
    });
    app.get("/api/v1/offers", async (req, res) => {
      const result = await offers.findOne();
      res.send(result);
    });
    app.get("/api/v1/appointments", async (req, res) => {
      const result = await appointments.find().toArray();
      res.send(result);
    });
    app.get("/api/v1/appointments/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await appointments.find(query).toArray();
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Backend is running");
});
app.listen(port, () => {
  console.log(`backend is running on port ${port}`);
});
