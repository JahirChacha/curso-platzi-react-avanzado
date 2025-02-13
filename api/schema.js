const userModel = require('./models/userModel')
const categoriesModel = require('./models/categoriesModel')
const photosModel = require('./models/photosModel')
const { gql } = require('apollo-server-express')
const jsonwebtoken = require('jsonwebtoken')
const bcrypt = require('bcrypt')

// Definición de tipos para GraphQL
const typeDefs = gql`
  type User {
    id: ID
    avatar: String
    name: String
    email: String
    isPremium: Boolean
  }

  type Photo {
    id: ID
    categoryId: Int
    src: String
    likes: Int
    liked: Boolean
    userId: ID
  }

  type Category {
    id: ID
    cover: String
    name: String
    emoji: String
    path: String
  }

  type Query {
    favs: [Photo]
    categories: [Category]
    photos(categoryId: ID): [Photo]
    photo(id: ID!): Photo
  }

  input LikePhoto {
    id: ID!
  }

  input UserCredentials {
    email: String!
    password: String!
  }

  type Mutation {
    likeAnonymousPhoto(input: LikePhoto!): Photo
    likePhoto(input: LikePhoto!): Photo
    signup(input: UserCredentials!): String
    login(input: UserCredentials!): String
  }
`

// Función para verificar si el usuario está logueado
function checkIsUserLogged (context) {
  const { email, id } = context
  if (!id) throw new Error('Debes estar logueado para realizar esta acción')
  const user = userModel.find({ email })
  if (!user) throw new Error('El usuario no existe')
  return user
}

// Función para intentar obtener los favoritos del usuario logueado
function tryGetFavsFromUserLogged (context) {
  try {
    const { email } = checkIsUserLogged(context)
    const user = userModel.find({ email })
    return user.favs
  } catch (e) {
    return []
  }
}

const resolvers = {
  Mutation: {
    likeAnonymousPhoto: (_, { input }) => {
      const { id: photoId } = input
      const photo = photosModel.find({ id: photoId })
      if (!photo) {
        throw new Error(`No se pudo encontrar la foto con id ${photoId}`)
      }
      photosModel.addLike({ id: photoId })
      const actualPhoto = photosModel.find({ id: photoId })
      return actualPhoto
    },
    likePhoto: (_, { input }, context) => {
      const { id: userId } = checkIsUserLogged(context)
      const { id: photoId } = input
      const photo = photosModel.find({ id: photoId })
      if (!photo) {
        throw new Error(`No se pudo encontrar la foto con id ${photoId}`)
      }

      const hasFav = userModel.hasFav({ id: userId, photoId })

      if (hasFav) {
        photosModel.removeLike({ id: photoId })
        userModel.removeFav({ id: userId, photoId })
      } else {
        photosModel.addLike({ id: photoId })
        userModel.addFav({ id: userId, photoId })
      }

      const favs = tryGetFavsFromUserLogged(context)
      const actualPhoto = photosModel.find({ id: photoId, favs })
      return actualPhoto
    },
    async signup (_, { input }) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const { email, password } = input
      const user = await userModel.find({ email })

      if (user) {
        throw new Error('El usuario ya existe')
      }

      const newUser = await userModel.create({
        email,
        password
      })

      return jsonwebtoken.sign(
        { id: newUser.id, email: newUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1y' }
      )
    },
    async login (_, { input }) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const { email, password } = input
      const user = await userModel.find({ email })

      if (!user) {
        throw new Error('No hay usuario con ese correo electrónico')
      }

      const valid = await bcrypt.compare(password, user.password)

      if (!valid) {
        throw new Error('Contraseña incorrecta')
      }

      return jsonwebtoken.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      )
    }
  },
  Query: {
    favs (_, __, context) {
      const { email } = checkIsUserLogged(context)
      const { favs } = userModel.find({ email })
      return photosModel.list({ ids: favs, favs })
    },
    categories () {
      return categoriesModel.list()
    },
    photo (_, { id }, context) {
      const favs = tryGetFavsFromUserLogged(context)
      return photosModel.find({ id, favs })
    },
    photos (_, { categoryId }, context) {
      const favs = tryGetFavsFromUserLogged(context)
      return photosModel.list({ categoryId, favs })
    }
  }
}

module.exports = { typeDefs, resolvers }
