import { Router } from "express"
import { createHash } from "node:crypto"
import { writeFileSync } from "node:fs"
const router = Router()
router.get('/password', async (req, res) => {
    const password = "TODO".concat() //TODO
    if (password === '') {
        res.send({ status: 'unset' })
    }
    else if (req.headers['risu-auth'] === password) {
        res.send({ status: 'correct' })
    }
    else {
        res.send({ status: 'incorrect' })
    }
})

router.post('/crypto', async (req, res, next) => {
    try {
        const hash = createHash('sha256')
        hash.update(Buffer.from(req.body.data, 'utf-8'))
        res.send(hash.digest('hex'))
    } catch (error) {
        next(error)
    }
})


router.post('/set_password', async (req, res) => {
    let password = "TODO".concat() //TODO
    let passwordPath = "" //TODO

    if (password === '') {
        password = req.body.password
        writeFileSync(passwordPath, password, 'utf-8')
    }
    res.status(400).send("already set")
})
export default router