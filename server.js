import express from 'express'
import { productsRouter } from './routes/products.js'
import { authRouter } from './routes/auth.js'
import { meRouter } from './routes/me.js'
import { cartRouter } from './routes/cart.js' 
import session from 'express-session'
import crypto from 'crypto'

const app = express() 
const PORT = 3000
const secret = process.env.SPIRAL_SESSION_SECRET || 'jellyfish-baskingshark'
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret_here'

// Razorpay webhook MUST come BEFORE express.json()
app.post('/api/webhooks/razorpay', express.raw({type: 'application/json'}), (req, res) => {
  const webhookSignature = req.headers['x-razorpay-signature']
  const webhookBody = req.body
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(webhookBody)
    .digest('hex')
  
  if (expectedSignature !== webhookSignature) {
    console.log('❌ Invalid webhook signature')
    return res.status(400).json({ error: 'Invalid signature' })
  }
  
  // Parse the body after verification
  const event = JSON.parse(webhookBody.toString())
  
  console.log('✅ Razorpay Webhook Verified!')
  console.log('Event Type:', event.event)
  console.log('Payment ID:', event.payload.payment?.entity?.id)
  console.log('Amount:', event.payload.payment?.entity?.amount / 100, 'INR')
  console.log('Status:', event.payload.payment?.entity?.status)
  
  // Handle different events
  switch(event.event) {
    case 'payment.captured':
      console.log('💰 Payment successful!')
      // TODO: Update order status in database
      break
    case 'payment.failed':
      console.log('❌ Payment failed!')
      // TODO: Handle failed payment
      break
    default:
      console.log('📬 Other event:', event.event)
  }
  
  res.status(200).json({ status: 'received' })
})

app.use(express.json()) 

app.use(session({
  secret: secret,
  resave: false, 
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
  }
}))

app.use(express.static('public'))

app.use('/api/products', productsRouter)

app.use('/api/auth/me', meRouter)

app.use('/api/auth', authRouter)

app.use('/api/cart', cartRouter)
 
app.listen(PORT, '0.0.0.0', () => { 
  console.log(`Server running at http://0.0.0.0:${PORT}`)
  console.log(`Access from other devices using your WSL IP address`)
}).on('error', (err) => {
  console.error('Failed to start server:', err)
})