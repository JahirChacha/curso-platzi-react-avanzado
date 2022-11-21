import { useEffect, useState } from 'react'

export const useGetCategories = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState()

  useEffect(() => {
    setLoading(true)
    // window.fetch('https://petgram-api.midudev.now.sh/categories')

    window
      .fetch('http://localhost:3500/categories')
      .then(res => res.json())
      .then(categories => {
        setCategories(categories)
      })
      .catch(err => {
        setError(err)
      })
  }, [])

  return { categories, error, loading }
}
