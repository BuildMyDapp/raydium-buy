import express from 'express'
import NotForSaleModel from './db/not-for-sale';

const app = express()
app.use(express.json())

app.post('/api/notForSale', async (req, res) => {
    try {
        const { tokenAddress } = req.body
        await NotForSaleModel.create({
            mint_address: tokenAddress
        })
        res.status(200).json({ status: "token added in not for sale list" })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

app.get('/api/notForSale', async (req, res) => {
    try {
        const result = await NotForSaleModel.find()
        res.status(200).json({ data: result })
    } catch (error) {
        console.error(error)
        res.status(500).json({ data: [], error: 'Internal Server Error' })
    }
})

app.delete('/api/notForSale', async (req, res) => {
    try {
        const { tokenAddress } = req.body
        await NotForSaleModel.deleteOne({ mint_address: tokenAddress });
        res.status(200).json({ status: "token removed in not for sale list" })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

export function init() {
    app.listen('3000', () =>
        console.log('listening on port 3000')
    )
}