import express from 'express'
import { neon } from '@neondatabase/serverless';
import { logger } from './logger';
import { retrieveEnvVariable } from './env';
const db_url = retrieveEnvVariable('DB_URL', logger);

const sql = neon(db_url);

const app = express()


app.use(express.json())


app.post('/api/notForSale', async (req, res) => {
    try {
        const { tokenAddress } = req.body

        await sql(`
            INSERT INTO NotForSale (mint_address)
      VALUES (
          '${tokenAddress}'
        );`)
        res.status(200).json({status:"token added in not for sale list"})
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

app.get('/api/notForSale', async (req, res) => {
    try {

        const result = await sql(`SELECT * from NotForSale`)
        res.status(200).json({data:result})
    } catch (error) {
        console.error(error)
        res.status(500).json({ data:[],error: 'Internal Server Error' })
    }
})

app.delete('/api/notForSale', async (req, res) => {
    try {
        const { tokenAddress } = req.query

        await sql(`
            DELETE FROM NotForSale
            WHERE mint_address = '${tokenAddress}';
        `);
        res.status(200).json({status:"token removed in not for sale list"})
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

export function init(){
app.listen('3000', ()=>
    console.log('listening on port 3000')
)
}