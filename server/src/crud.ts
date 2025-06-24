import { Router } from "express";

const router = Router()
router.get('/read', async (req, res, next) => {
    if (req.headers['risu-auth'].trim() !== password.trim()) {
        console.log('incorrect')
        res.status(400).send({
            error: 'Password Incorrect'
        });
        return
    }
    const filePath = req.headers['file-path'];
    if (!filePath) {
        console.log('no path')
        res.status(400).send({
            error: 'File path required'
        });
        return;
    }

    if (!isHex(filePath)) {
        res.status(400).send({
            error: 'Invaild Path'
        });
        return;
    }
    try {
        if (!existsSync(path.join(savePath, filePath))) {
            res.send();
        }
        else {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.sendFile(path.join(savePath, filePath));
        }
    } catch (error) {
        next(error);
    }
});

router.get('/remove', async (req, res, next) => {
    if (req.headers['risu-auth'].trim() !== password.trim()) {
        console.log('incorrect')
        res.status(400).send({
            error: 'Password Incorrect'
        });
        return
    }
    const filePath = req.headers['file-path'];
    if (!filePath) {
        res.status(400).send({
            error: 'File path required'
        });
        return;
    }
    if (!isHex(filePath)) {
        res.status(400).send({
            error: 'Invaild Path'
        });
        return;
    }

    try {
        await fs.rm(path.join(savePath, filePath));
        res.send({
            success: true,
        });
    } catch (error) {
        next(error);
    }
});

router.get('/list', async (req, res, next) => {
    if (req.headers['risu-auth'].trim() !== password.trim()) {
        console.log('incorrect')
        res.status(400).send({
            error: 'Password Incorrect'
        });
        return
    }
    try {
        const data = (await fs.readdir(path.join(savePath))).map((v) => {
            return Buffer.from(v, 'hex').toString('utf-8')
        })
        res.send({
            success: true,
            content: data
        });
    } catch (error) {
        next(error);
    }
});

router.post('/write', async (req, res, next) => {
    if (req.headers['risu-auth'].trim() !== password.trim()) {
        console.log('incorrect')
        res.status(400).send({
            error: 'Password Incorrect'
        });
        return
    }
    const filePath = req.headers['file-path'];
    const fileContent = req.body
    if (!filePath || !fileContent) {
        res.status(400).send({
            error: 'File path required'
        });
        return;
    }
    if (!isHex(filePath)) {
        res.status(400).send({
            error: 'Invaild Path'
        });
        return;
    }

    try {
        await fs.writeFile(path.join(savePath, filePath), fileContent);
        res.send({
            success: true
        });
    } catch (error) {
        next(error);
    }
});

export default router