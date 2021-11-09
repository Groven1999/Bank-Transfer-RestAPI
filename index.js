const accountsJson = require("./accounts.json")
const transactionsJson = require("./transactions.json")

const { v4: uuidv4 } = require('uuid');

const fs = require("fs")

const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const PORT = 8080;

// create application/json parser
const jsonParser = bodyParser.json();

const urlencodedParser = bodyParser.urlencoded({extended: true});

app.use (express.json())

app.listen(
    PORT,
    () => console.log(`Server is running on port ${PORT}`)
)

app.get("/api/accounts", (req, res) => {
    res.status(200).send(accountsJson)
});

app.get("/api/transaction", (req, res) => {
    res.status(200).send(transactionsJson)
});

app.post("/api/transaction", urlencodedParser, (req, res) => {

    const startTime = Date.now();

    const { fromAccount, toAccount, amount } = req.body;

    // check if the two accounts exists in the database
    let fromAccountExists = false
    let toAccountExists = false

    for (let i = 0; i < Object.keys(accountsJson).length; i++) {
        if (accountsJson[i].id === fromAccount) {
            fromAccountExists = true
        } else if (accountsJson[i].id === toAccount) {
            toAccountExists = true
        }
    }

    if (!(fromAccountExists && toAccountExists)) {
        res.status(400).send({
            message: "One of the account IDs does not exists!"
        })

        return
    }

    // check if any accounts has negative cash balance
    for (let i = 0; i < Object.keys(accountsJson).length; i++) {
        if (parseFloat(accountsJson[0].available_cash) < 0) {
            res.status(400).send({
                message: "One of the accounts has negative cash balance!"
            })
            return
        }
    }

    // check if fromAccount has enough money to make this transfer
    for (let i = 0; i < Object.keys(accountsJson).length; i++) {
        if (accountsJson[i].id === fromAccount) {
            if (parseFloat(accountsJson[i].available_cash) - amount < 0) {
                res.status(400).send({
                    message: "You do not have enough money to make this transfer!"
                })
                return
            }
        }

    }

    // if there are no errors
    for (let i = 0; i < Object.keys(accountsJson).length; i++) {
        let account = accountsJson[i]
        if (account.id === fromAccount) {
            let newAmount = 0;
            newAmount = parseFloat(accountsJson[i].available_cash) - amount;
            accountsJson[i].available_cash = newAmount.toString()
        } else if (account.id === toAccount) {
            let newAmount = 0;
            newAmount = parseFloat(accountsJson[i].available_cash) + parseFloat(amount);
            accountsJson[i].available_cash = newAmount.toString();
        }
    }

    // update accounts data
    fs.writeFile("./accounts.json", JSON.stringify(accountsJson), err => {
        if (err) {
            console.log(err);
        } else {
            console.log("File saved");
        }
    })

    // update transactions data
    const millis = Date.now() - startTime;

    const newTransaction = {
        "id": uuidv4(),
        "registeredTime": startTime,
        "executedTime": millis,
        "success": "true",
        "cashAmount": amount,
        "sourceAccount": fromAccount,
        "destinationAccount": toAccount
    }

    transactionsJson.push(newTransaction);

    fs.writeFile("./transactions.json", JSON.stringify(transactionsJson), err => {
        if (err) {
            console.log(err);
        } else {
            console.log("File saved");

            res.status(200).send(
                newTransaction
            )
        }
    })
})