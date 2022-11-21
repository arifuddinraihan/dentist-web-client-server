const express = require('express');
const cors = require('cors');

// MongoDB using credential for Node.js
const { MongoClient, ServerApiVersion } = require('mongodb');

// Must do Work, You will forget everytime
require('dotenv').config()

// Server Creation and Port
const app = express();
const port = process.env.PORT || 5000;

// Express Middleware
app.use(cors());
app.use(express.json());

// User details for the database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tsvgbta.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// MongoDB server data commads here
async function run() {
    try {
        const appointmentOptionsCollection = client.db('arifDentistPortal').collection('appointmentOptions');
        const bookingDetailsCollection = client.db('arifDentistPortal').collection('bookingDetails');


        app.get('/appointmentOptions', async (req, res) => {
            const date = req.query.date;
            const query = {}
            // main option collection
            const options = await appointmentOptionsCollection.find(query).toArray();

            // get the booking of the quried or provided date
            const bookingQuery = { appointmentDate: date };
            // main treatment collection
            const alreadyBooked = await bookingDetailsCollection.find(bookingQuery).toArray();

            // Merging two collection to get the available slots
            options.forEach(option => {
                // filter the treatment types depend on booked treatment for the day
                const optionBooked = alreadyBooked.filter(book => book.careFor === option.name);

                // pull out the Array of which slots been booked for the day
                const bookedSlots = optionBooked.map(book => book.slot);

                // If optio slots are not included in bookedSlots then it's filter will be remaining slots or available slots
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
                option.slots = remainingSlots;
            })
            res.send(options)
        })

        // Naming Convention
        // app.get('/bookings')
        // app.post('/bookings')
        // app.patch('/bookings/:id')
        // app.delete('/bookings/:id')

        app.post('/bookings', async (req, res) => {
            const bookingInfo = req.body;
            // filer the query using date of treatment, email & treatment date
            const query = {
                appointmentDate: bookingInfo.appointmentDate,
                email: bookingInfo.email,
                careFor: bookingInfo.careFor
            }
            // pull out the current booking on treatment depends on date from query
            const alreadyBooked = await bookingDetailsCollection.find(query).toArray();

            // if user have the treatment booked for the day than we will send acknowledged false and a message
            if (alreadyBooked.length) {
                const message = `You already have a booking on ${bookingInfo.appointmentDate}`
                return res.send({ acknowledged: false, message })
            }

            const bookingDetails = await bookingDetailsCollection.insertOne(bookingInfo);
            res.send(bookingDetails)
        })
        // Use Aggreagate to query multiple collection and then merge data
        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            };
            const allBookingDetails = await bookingDetailsCollection.find(query).toArray();
            console.log(allBookingDetails)
            res.send(allBookingDetails)
        })

    }
    finally {

    }
}
run().catch(err => console.error(err))

app.get('/', (req, res) => {
    res.send("Arif's Dentist Server Running")
})

app.listen(port, () => {
    console.log(`Arif's Dentist server running on port: ${port}`)
})