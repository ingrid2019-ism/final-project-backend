import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import mongoose from 'mongoose'
import booksData from './books.json'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/books1'
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise
mongoose.set('useCreateIndex', true)

//Create the data models here:
const User = mongoose.model('User', {
  name: {
    type: String,
    unique: true
  },
  email: {
    type: String,
    unique: true
  },
  password: {
    type: String,
    required: true,
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
})

const Book = mongoose.model('Book', {
  bookId: {
    type: Number
  },
  title: {
    type: String
  },
  authors: {
    type: String
  },
  average_rating: {
    type: Number
  },
  price: {
    type: Number
  }
})

//Seed the database here:
//if (process.env.RESET_DATABASE) {
//console.log('Resetting my database!')

const seedDatabase = async () => {
  await Book.deleteMany()
  booksData.forEach((book) => {
    book.price = book.num_pages
    new Book(book).save()
  })
}
seedDatabase()
//}

const authenticateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ accessToken: req.header('Authorization') })
    if (user) {
      req.user = user
      next()
    } else {
      res.status(401).json({ loggedOut: true, message: "please try to login again" })
    }
  } catch (err) {
    res
      .status(403)
      .json({ message: 'access token missing or wrong', errors: err.message })
  }
}



//   PORT=9000 npm start
const port = process.env.PORT || 8080
const app = express()

// Add middlewares to enable cors and json body parsing
app.use(cors())
app.use(bodyParser.json())

// Start defining your routes here
app.get('/', (req, res) => {
  res.send('Hello world')
})

// Get all the books
app.get('/books', async (req, res) => {
  const books = await Book.find()
  res.json(books)
})

// Create user - sign up
app.post('/users', async (req, res) => {
  try {
    const { name, email, password } = req.body
    const user = new User({ name, email, password: bcrypt.hashSync(password) })
    const saved = await user.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(401).json({ message: 'Could not create user', errors: err.errors })
  }
})

// Get one users info/profile page
app.get('/users/:id', authenticateUser)
app.get('/users/:id', async (req, res) => {
  try {
    res.status(201).json(req.user)
  } catch (err) {
    res.status(400).json({ message: 'could not save user', errors: err.message })
  }
})

// Log in
app.post('/sessions', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (user && bcrypt.compareSync(password, user.password)) {
      res.json({ userId: user._id, accessToken: user.accessToken })
    } else {
      res.json({ notFound: true, message: 'wrong username or password' })
    }
  } catch (err) {
    res.status(400).json({ errors: err.errors })
  }
})

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})


