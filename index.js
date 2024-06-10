const express = require('express')
const cors = require('cors')
const app = express()
require('dotenv').config()
var jwt = require('jsonwebtoken');
const stripe = require("stripe")(`${process.env.PAYMENT_KEY}`);
const port =process.env.PORT || 3000
app.use(express.json())
app.use(cors())






const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB}:${process.env.password}@cluster0.hwuf8vx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});




const verifyJWT=(req,res,next)=>{
  console.log('hitting server')
 //  console.log(req.headers.authorize)
   const authorize=req.headers.authorize;
   if (!authorize) {
     return res.status(401).send({error:true,message:'unauthorize access'})
   }
   const token = authorize.split(' ')[1]
   console.log(token)
   jwt.verify(token,process.env.AccessToken,(error,decoded)=>{
     if(error){
      return res.status(401).send({error: true , message:"unauthorize access"})
     }
     req.decoded=decoded
     next()
   })
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    const database=client.db("eduDB")
    const userCollection=database.collection('user')
    const classCallection=database.collection('class')
    const assigmentCallection=database.collection('assigment')
    const teacherRequest=database.collection('teacher-req')
    const paymentCollection=database.collection('payment')
    const feedBackCollection=database.collection('feedback')
    console.log("Pinged your deployment. You successfully connected to MongoDB!");


    app.post('/jwt',(req,res)=>{
      const user= req.body;
      console.log(user)
      const token= jwt.sign(user,process.env.AccessToken,{
        expiresIn:'2000h'
      });
      console.log(token)
      res.send({token})
  
     })

   app.post('/user',async(req,res)=>{
       const userpost=req.body
       const existingUser = await userCollection.findOne({ email: userpost.email });
  
       if (existingUser) {
         return res.status(400).json({ message: 'User already exists' });
       }
       const result= await userCollection.insertOne(userpost)
       res.send(result)
       console.log(result)
   })

   app.get('/user',verifyJWT,async(req,res)=>{
    const result= await userCollection.find().toArray()
    res.send(result)
   })
  //  app.patch('/user/:id',async(req,res)=>{
     const updateFields = req.body;
     const id = req.params.id;

    const userQuery = { _id: new ObjectId(id) };
    const userUpdateDoc = { $set: { ...updateFields, role: 'admin' } };
    const userResult = await userCollection.updateOne(userQuery, userUpdateDoc);
   })

   app.get('/user/admin/:email',verifyJWT, async (req, res) => {
    const email = req.params.email;
    const query = { email: email }
    const user = await userCollection.findOne(query)
    const result = { admin: user?.role === 'admin' }
    res.send(result)
  })
   app.get('/user/teacher/:email',verifyJWT, async (req, res) => {
    const email = req.params.email;
    const query = { email: email }
    const user = await userCollection.findOne(query)
    const result = { admin: user?.role === 'teacher' }
    res.send(result)
  })


  // class api route
  app.post('/class',async(req,res)=>{
    const userpost=req.body
    const result= await classCallection.insertOne(userpost)
    res.send(result)
})
  app.get('/class',verifyJWT,async(req,res)=>{
    const result= await classCallection.find().toArray()
    res.send(result)
})

app.get('/classes', async (req, res) => {
  // Get the page and limit from the query parameters, with default values
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Calculate the starting index of the results
  const startIndex = (page - 1) * limit;

  try {
      // Get the paginated results from the collection
      const results = await classCallection.find().skip(startIndex).limit(limit).toArray();

      // Optionally, get the total count of documents for pagination info
      const totalDocuments = await classCallection.countDocuments();

      // Send the results along with pagination info
      res.send({
          page,
          limit,
          totalPages: Math.ceil(totalDocuments / limit),
          totalDocuments,
          results
      });
  } catch (err) {
      // Handle any errors
      res.status(500).send({ error: 'An error occurred while fetching the data.' });
  }
});


  app.delete('/class/:id',verifyJWT,async(req,res)=>{
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result= await classCallection.deleteOne(query)
    res.send(result)
})
  app.get('/class/:id',async(req,res)=>{
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result= await classCallection.findOne(query)
    res.send(result)
})
  app.patch('/class/:id',verifyJWT,async(req,res)=>{
    const id = req.params.id
    const updateFields = req.body;
    const updateDoc = { $set: updateFields };
    const query = { _id: new ObjectId(id) }
    const result= await classCallection.updateOne(query,updateDoc)
    res.send(result)
})
  app.patch('/statusChange/:id',verifyJWT,async(req,res)=>{
    const id = req.params.id
    const updateFields = req.body;
    const updateDoc = { $set: updateFields };
    const query = { _id: new ObjectId(id) }
    const result= await classCallection.updateOne(query,updateDoc)
    res.send(result)
})

  app.get('/myclass',verifyJWT,async(req,res)=>{
    const email=req.query.email
    const result= await classCallection.find({email:email}).toArray()
    res.send(result)
})

// assigment api

app.post('/assigment',async(req,res)=>{
  const assigmentPost=req.body
  const result= await assigmentCallection.insertOne(assigmentPost)
  res.send(result)
})
app.patch('/submitassigment/:id',async(req,res)=>{
  const { _id, email,classId,title,deadline } = req.body;
  const id = req.params.id;
  const result = await assigmentCallection.updateOne(
    { _id: new ObjectId(id) },
    {
      $push: {
        submissions: {
          email:email,
          classId:classId,
          title:title,
          deadline:new Date(deadline),
          submittedAt: new Date()
        }
      }
    }
  );
  res.send(result)
  console.log(result)
})

app.get('/assigment',verifyJWT,async(req,res)=>{
  const result= await assigmentCallection.find().toArray()
  res.send(result)
})


// apply teacher

app.post('/apply',verifyJWT,async(req,res)=>{
  const request=req.body
  const result= await teacherRequest.insertOne(request)
  res.send(result)
})
app.get('/apply',verifyJWT,async(req,res)=>{
 
  const result= await teacherRequest.find().toArray()
  res.send(result)
})
app.patch('/changeStatusTeacger/:id',async(req,res)=>{
 
  const id = req.params.id
  const updateFields = req.body;
  const updateDoc = { $set: updateFields };
  const query = { _id: new ObjectId(id) }
  const result= await teacherRequest.updateOne(query,updateDoc)
     res.send(
         result,
    );
  console.log(result)
  
})


app.patch('/teacherRole/:email',verifyJWT, async (req, res) => {
  try {
    const email = req.params.email;
    const updateFields = req.body;

    if (!email) {
      return res.status(400).send({ error: 'Email is required' });
    }

    const userQuery = { email: email };
    const userUpdateDoc = { $set: { ...updateFields, role: 'teacher' } };
    const userResult = await userCollection.updateOne(userQuery, userUpdateDoc);

    if (userResult.matchedCount === 0) {
      return res.status(404).send({ error: 'User not found' });
    }

    return res.send({ message: 'User role updated successfully', userUpdate: userResult });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
});

// payment

app.post('/create-payment-intent',verifyJWT, async (req, res) => {
  const { price } = req.body;
  const amount = price * 100; // Convert price to cents (Stripe expects the amount in cents)
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      payment_method_types: ['card']
    });

    res.send({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).send({ error: 'Error creating payment intent' });
  }
});   

app.post('/payment',verifyJWT,async(req,res)=>{
  const request=req.body
  const result= await paymentCollection.insertOne(request)
  res.send(result)
})

app.get('/payment',verifyJWT,async(req,res)=>{
  const result=await paymentCollection.find().toArray()
  res.send(result)

  
})

// feedBack
app.post('/feedback',verifyJWT,async(req,res)=>{
  const request=req.body
  const result= await feedBackCollection.insertOne(request)
  res.send(result)
})
app.get('/feedback',async(req,res)=>{
  const result=await feedBackCollection.find().toArray()
  res.send(result)

  
})
app.get('/count',async(req,res)=>{
 
  const users= await userCollection.estimatedDocumentCount()
  const total= await classCallection.estimatedDocumentCount()
  const enroll= await paymentCollection.estimatedDocumentCount()
  res.send({
    users,
    total,
    enroll
  })
  
})

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);






app.get('/', (req, res) => {
  res.send('Server Running!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})