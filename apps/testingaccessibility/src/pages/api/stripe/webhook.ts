import {buffer} from 'micro'
import type {NextApiRequest, NextApiResponse} from 'next'
import {stripe} from '../../../utils/stripe'
import {sendServerEmail} from '../../../utils/send-server-email'
import {nextAuthOptions} from '../auth/[...nextauth]'
import {recordNewPurchase} from '../../../utils/record-new-purchase'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const buf = await buffer(req)
    const sig = req.headers['stripe-signature']

    let event: any

    try {
      event = stripe.webhooks.constructEvent(buf, sig as string, webhookSecret)

      if (event.type === 'checkout.session.completed') {
        const {user} = await recordNewPurchase(event.object.id)

        if (!user) throw new Error('no-user-created')

        await sendServerEmail({
          email: user.email as string,
          nextAuthOptions,
        })

        res.status(200).send(`This works!`)
      }
    } catch (err: any) {
      res.status(400).send(`Webhook Error: ${err.message}`)
      return
    }
  } else {
    res.setHeader('Allow', 'POST')
    res.status(405).end('Method Not Allowed')
  }
}

export default handler

export const config = {
  api: {
    bodyParser: false,
  },
}
