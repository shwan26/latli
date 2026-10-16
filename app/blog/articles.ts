// Guides shown on /blog. English only, like the Terms and Privacy pages.
// One string is one paragraph. An array of strings is a bullet list.

export type ArticleBlock = string | string[]

export type ArticleSection = {
  heading: string
  body: ArticleBlock[]
}

export type Article = {
  slug: string
  title: string
  description: string
  published: string
  readMinutes: number
  sections: ArticleSection[]
}

export const ARTICLES: Article[] = [
  {
    slug: "track-orders-from-chat-messages",
    title: "How to Track Customer Orders That Arrive in Chat Messages",
    description:
      "Many small shops take orders in Facebook Messenger, LINE or Viber. Here is a simple way to stop losing orders in the scroll.",
    published: "2026-10-10",
    readMinutes: 6,
    sections: [
      {
        heading: "Why chat orders get lost",
        body: [
          "If you run a small online shop, most of your orders probably do not arrive through a checkout page. They arrive as a message: a photo of a product, a size, an address, and a quick \"can you get this for me?\". The conversation is friendly and fast, which is exactly why people buy from you. It is also why things go missing.",
          "A chat app is built for talking, not for record keeping. Orders sit between greetings, voice notes and stickers. A week later you cannot remember whether the customer paid a deposit, which colour they wanted, or whether you already bought the item from the supplier. Scrolling back through a long thread to find one detail wastes time, and a missed detail costs money.",
        ],
      },
      {
        heading: "What every order record needs",
        body: [
          "Before choosing a tool, decide what you must know about every order. A useful record is short, but it is complete. At minimum write down:",
          [
            "Who ordered: the customer's name, the name they use in chat, and a phone number.",
            "What they ordered: product name, link or photo, and any variant such as colour or size.",
            "What you will pay and what you will charge: your cost from the supplier and the price you quote the customer.",
            "Money status: nothing paid, a deposit paid, or fully paid, and how much is still owed.",
            "Where it is in the process: not bought yet, bought, sent to the cargo company, delivered, or returned.",
          ],
          "If you can answer those five questions for any order in a few seconds, you are in control. If you cannot, you are relying on memory.",
        ],
      },
      {
        heading: "Copy the order out of the chat right away",
        body: [
          "The most important habit is to move the order out of the conversation as soon as the customer confirms it. Do not leave it for the evening. Every hour you wait, the details you remember get fuzzier, and the chance of mixing two customers' orders grows.",
          "A practical routine is to confirm the order in chat with a short summary message, for example the product, the total price and the deposit you need. Then record exactly that summary in your system. The customer has seen the summary and agreed, so if there is a later disagreement you both have the same information.",
        ],
      },
      {
        heading: "Use one place, not three",
        body: [
          "Some shop owners keep a notebook, a spreadsheet and a notes app at the same time. Each one holds part of the picture, and none of them agrees with the others. Pick a single place for orders and use it every time, even for small ones. A customer who orders one cheap item today may place a large order next month, and you will want their full history.",
          "A spreadsheet works for the first few dozen orders. As you grow you will want something that can filter by status, show who still owes you money, and calculate profit without you writing formulas. Latli is built for that job: you record the order once and it keeps the customer, shop, payment and delivery status together.",
        ],
      },
      {
        heading: "Review your open orders every day",
        body: [
          "Recording orders is only half the work. Once a day, spend five minutes going through everything that is not finished. Ask three questions: which orders still need to be bought, which are waiting for payment, and which are waiting for delivery. Message customers who owe a balance, and chase suppliers whose items are late.",
          "This daily review is what turns a list of orders into a business that runs smoothly. Customers notice when you remember their order, answer quickly and give accurate delivery updates. That reliability is what brings repeat buyers.",
        ],
      },
      {
        heading: "Start small",
        body: [
          "You do not need a perfect system on day one. Start by recording every new order using the five points above. After a week you will see which details you keep wishing you had written down, and you can add them. The goal is simple: no order should live only inside a chat thread.",
        ],
      },
    ],
  },
  {
    slug: "calculate-profit-on-pre-orders",
    title: "How to Calculate Real Profit on Pre-Orders and Resale",
    description:
      "Selling price minus cost is not your profit. Learn how to include shipping, fees, refunds and currency changes so you know what you really earn.",
    published: "2026-10-09",
    readMinutes: 7,
    sections: [
      {
        heading: "Revenue is not profit",
        body: [
          "When a customer pays you 1,000 and you bought the item for 700, it is tempting to say you made 300. Sometimes that is true. Often it is not, because the item cost you more than the supplier's price. Every business that buys on behalf of customers has extra costs that quietly eat into the margin.",
          "The only way to know your real profit is to record every cost against the order that caused it. This guide shows the costs most small resellers forget.",
        ],
      },
      {
        heading: "The basic formula",
        body: [
          "For one order, profit is what the customer paid you, minus everything you paid to get the item to them. Written out:",
          "Profit = selling price − product cost − shipping and cargo fees − payment or platform fees − refunds or discounts.",
          "If you quoted the customer a price that already includes shipping, the shipping you pay still belongs in the cost side. Do not skip it just because the customer did not see it as a separate line.",
        ],
      },
      {
        heading: "Costs people forget",
        body: [
          [
            "Cargo or courier fees from the supplier to you, and from you to the customer.",
            "Bank, e-wallet or transfer fees, especially when you pay a supplier in another country.",
            "Currency conversion. If you pay in one currency and charge in another, the exchange rate on the day you buy matters.",
            "Packaging, tape, bags and printed labels.",
            "Items that are returned, damaged or refused, where you cannot resell at full price.",
            "Discounts you gave to regular customers to keep their business.",
          ],
          "Individually these look small. Across fifty orders a month they can be the difference between a profitable shop and one that is only busy.",
        ],
      },
      {
        heading: "Handling deposits and unpaid balances",
        body: [
          "Pre-order shops usually collect a deposit first and the balance later. Be careful not to count deposits as profit. A deposit is money you hold against an order that is not finished. Until the item is bought, delivered and the balance is collected, the profit is only expected, not earned.",
          "Track two numbers separately: what customers have paid you so far and what they still owe. If your sales look great but a large share is unpaid, your cash is tied up even though your reports look healthy.",
        ],
      },
      {
        heading: "Look at profit per product and per supplier",
        body: [
          "Once each order has its own cost and price, you can group the results. Add up profit by product and you will find the items that sell often but earn little, and the items that sell rarely but earn well. Group by supplier or shop and you will see which ones give you the best prices and the fewest problems.",
          "These comparisons are where decisions come from. You may drop a popular product that barely breaks even, or raise your price on something customers happily pay more for. Without per-order records, these are guesses.",
        ],
      },
      {
        heading: "Make it a habit",
        body: [
          "Enter the cost when you buy the item, and the final price when the customer pays. Do not wait until the end of the month, when receipts are lost and memory has faded. Latli keeps cost, selling price, payment and refunds on the same order, so your profit view is always based on real numbers rather than estimates.",
        ],
      },
    ],
  },
  {
    slug: "managing-deposits-and-unpaid-balances",
    title: "Managing Customer Deposits and Unpaid Balances",
    description:
      "A clear deposit policy and a simple tracking routine protect your cash flow and your friendly relationships with customers.",
    published: "2026-10-08",
    readMinutes: 6,
    sections: [
      {
        heading: "Why deposits matter",
        body: [
          "When you buy items on behalf of customers, you pay the supplier first. If the customer then changes their mind, you are left holding a product you did not plan to keep. A deposit shares that risk. It shows the customer is serious and covers at least part of your cost.",
          "A deposit policy also protects relationships. When the rule is clear from the start, nobody feels you are being unfair when you ask for it.",
        ],
      },
      {
        heading: "Set a simple deposit rule",
        body: [
          "Choose a rule you can explain in one sentence and apply it to everyone. Some shops ask for half the price upfront. Others ask for the full amount on low-priced items and a deposit on expensive ones. Repeat customers with a good record may earn lower deposits.",
          "Write the rule where customers can see it, such as your page description or a pinned message, and repeat it when you confirm each order. Consistency matters more than the exact percentage.",
        ],
      },
      {
        heading: "Record every payment, not just the total",
        body: [
          "A common mistake is to write \"paid\" or \"not paid\". Real orders are more complicated. A customer may pay a deposit, then a second part, then the rest after delivery. Record each payment with its amount and date so that you always know the remaining balance.",
          [
            "Not paid: nothing received yet.",
            "Partially paid: a deposit or instalment received, balance still owed.",
            "Fully paid: the full price received.",
            "Refunded: money returned to the customer, with the amount recorded.",
          ],
          "With these four states, you can list every customer who still owes money in a few seconds.",
        ],
      },
      {
        heading: "Remind customers politely and on time",
        body: [
          "Most late payments are forgetfulness, not bad intent. A short, friendly reminder usually works. Send it when the item arrives or is about to ship, include the exact remaining amount, and say how to pay. Keep the tone helpful rather than accusing.",
          "If a customer keeps delaying, hold the item until the balance is paid. Because your deposit rule was agreed at the start, this is simply following the policy.",
        ],
      },
      {
        heading: "Handle refunds carefully",
        body: [
          "Sometimes a refund is the right choice: the item was out of stock, it arrived damaged, or the supplier cancelled. Record the refund against the original order instead of deleting the payment, so your totals still make sense. Note the reason too. After a few months the reasons show patterns, such as one supplier causing most of your problems.",
        ],
      },
      {
        heading: "Check your total owed each week",
        body: [
          "Once a week, add up the balances customers owe you. This number is real money that belongs in your business but is not in your hands yet. If it keeps growing, tighten your deposit rule. If it stays small, you are collecting well. Tracking it takes a minute and gives you a much clearer picture of your cash position.",
        ],
      },
    ],
  },
  {
    slug: "cargo-and-delivery-tracking-for-small-shops",
    title: "Cargo and Delivery Tracking for Small Online Shops",
    description:
      "Keep tracking numbers, cargo companies and delivery stages organised so customers always get a clear answer about where their order is.",
    published: "2026-10-07",
    readMinutes: 6,
    sections: [
      {
        heading: "The question every customer asks",
        body: [
          "Sooner or later every customer sends the same message: \"Where is my order?\" If you have to search through chats, photos and notes to find out, the customer notices the delay, and trust drops. If you can answer in ten seconds with a precise status, the customer feels looked after.",
          "Delivery tracking does not have to be complicated. It needs a few facts recorded in the same place every time.",
        ],
      },
      {
        heading: "Break delivery into stages",
        body: [
          "An order usually passes through several steps, and each one can go wrong. Use clear stages so you always know where to look:",
          [
            "Not bought: the customer has ordered, but you have not purchased the item yet.",
            "Bought: you have paid the supplier and are waiting for the item.",
            "Sent to cargo: the item is with a cargo or courier company and moving toward you or the customer.",
            "Delivered: the customer has received it.",
            "Returned: the item came back, with a note on why.",
          ],
          "When an order is stuck, the stage tells you who to contact: the supplier, the cargo company, or the customer.",
        ],
      },
      {
        heading: "Record the cargo company and tracking number",
        body: [
          "Different cargo companies have different speeds, prices and reliability. Save the company name and the tracking number on the order itself. When a parcel is late, you can check it immediately instead of asking the customer to wait while you hunt for a receipt.",
          "Over time you will learn which companies are fast, which damage goods, and which are cheaper for certain routes. Keeping a list of the companies you use, with their phone numbers and locations, saves time when a problem needs a phone call.",
        ],
      },
      {
        heading: "Update customers before they ask",
        body: [
          "Customers are far more patient when they hear from you first. Send a short message at each major stage: item bought, item shipped with its tracking number, item arrived in the city, item out for delivery. One line each is enough. This reduces the number of \"where is it\" messages and shows that your shop is organised.",
        ],
      },
      {
        heading: "Plan for delays and damage",
        body: [
          "Parcels do get delayed or damaged. When it happens, tell the customer early and explain what you are doing about it. Take photos of damaged goods as soon as they arrive, and keep them with the order so you can claim from the cargo company or the supplier. A record of dates and tracking numbers makes any claim easier.",
        ],
      },
      {
        heading: "Review stuck orders each day",
        body: [
          "Every day, look at orders that have stayed in the same stage for longer than usual. A parcel that has been \"sent to cargo\" for far longer than normal needs a follow-up call. Catching these early is the biggest single improvement most small shops can make to their delivery service.",
        ],
      },
    ],
  },
  {
    slug: "organise-customers-and-suppliers",
    title: "How to Organise Your Customers and Suppliers",
    description:
      "Good contact records help you serve repeat buyers faster, remember their preferences and compare supplier prices.",
    published: "2026-10-06",
    readMinutes: 5,
    sections: [
      {
        heading: "Your contacts are an asset",
        body: [
          "The people who buy from you and the shops you buy from are the foundation of your business. Yet many owners keep their contacts only in a phone book or inside chat apps. When a customer changes their chat name or you replace your phone, the information disappears.",
          "A tidy contact list takes a little effort once and pays you back every day.",
        ],
      },
      {
        heading: "What to save for each customer",
        body: [
          [
            "Name and the name shown on their chat account, since these are often different.",
            "Phone number and delivery address.",
            "Preferences, such as favourite brands, sizes and colours.",
            "Order history, including what they bought, at what price, and how they paid.",
            "Notes, such as \"always pays on time\" or \"prefers delivery on weekends\".",
          ],
          "With this information you can greet a returning customer by name, suggest the right size, and avoid asking for an address you already have.",
        ],
      },
      {
        heading: "What to save for each supplier",
        body: [
          "For every shop or supplier you buy from, record the name, the contact method, the location, and notes about quality and speed. More importantly, record the prices you paid for each product. When the same item appears again, you can check whether the price went up and whether another supplier was cheaper.",
          "If you buy the same product from several shops, comparing them side by side often reveals savings that add up quickly.",
        ],
      },
      {
        heading: "Spot your best customers",
        body: [
          "A small number of customers usually generate a large share of your sales. When every order is linked to a customer, you can see who buys most often and who spends the most. Look after these people. Reply quickly, offer them early access to new items, and thank them. Repeat buyers cost far less to keep than new ones cost to find.",
        ],
      },
      {
        heading: "Keep it up to date",
        body: [
          "Update a record whenever something changes: a new address, a new phone number, a new preference. Add each new customer at the time of their first order rather than later. If your tool links orders to contact records automatically, as Latli does, you avoid typing the same details twice and your history stays accurate.",
        ],
      },
      {
        heading: "Protect your customers' privacy",
        body: [
          "Customer details are personal. Only store what you need, keep your account password private, and do not share contact information with anyone who has no reason to see it. Treating this data with care is part of earning customers' trust.",
        ],
      },
    ],
  },
  {
    slug: "monthly-sales-review-for-shop-owners",
    title: "A Simple Monthly Sales Review for Small Shop Owners",
    description:
      "Spend thirty minutes at the end of each month looking at five numbers, and make better decisions about what to sell and buy.",
    published: "2026-10-05",
    readMinutes: 6,
    sections: [
      {
        heading: "Why review monthly",
        body: [
          "When you are busy filling orders, it is easy to feel successful without knowing whether the business is actually healthy. A monthly review gives you a fixed moment to step back and look at the real numbers. It does not take long, and it turns daily activity into decisions.",
        ],
      },
      {
        heading: "The five numbers to check",
        body: [
          [
            "Total sales: the sum of what customers agreed to pay this month.",
            "Total cost: what you spent buying the items, including shipping and fees.",
            "Profit: sales minus cost, after refunds.",
            "Unpaid balances: money customers still owe you.",
            "Number of orders and repeat customers: how busy you were and how many people came back.",
          ],
          "If you record each order carefully through the month, these figures come almost for free.",
        ],
      },
      {
        heading: "Compare with last month",
        body: [
          "One month alone says little. Compare it with the previous month. Did sales rise but profit stay flat? That suggests costs are growing or you are discounting too much. Did the number of orders fall while profit per order rose? Perhaps you focused on better products. Trends matter more than single numbers.",
        ],
      },
      {
        heading: "Find your winners and losers",
        body: [
          "List your products by profit, not by number of sales. Sort the shops you bought from by how much profit they produced and how many problems they caused. You will usually find a few items that deliver most of your profit and some that take a lot of effort for very little return.",
          "Decide what to do with each group: promote the winners, adjust the price of the weak ones, or stop selling items that cost more time than they earn.",
        ],
      },
      {
        heading: "Check your cash",
        body: [
          "Profit on paper is not the same as cash in hand. Look at the unpaid balances and the items you have bought but not yet delivered. If a lot of money is stuck there, collect before you buy more stock. Many small shops run into trouble not because they are unprofitable, but because their cash is tied up.",
        ],
      },
      {
        heading: "Write down one change",
        body: [
          "End the review by choosing one specific change for next month. It might be raising the deposit, dropping a slow product, or switching a supplier. One clear change that you actually carry out is worth more than a long list you forget. Latli's dashboard and charts show monthly sales, cost and profit so this review takes minutes instead of hours.",
        ],
      },
    ],
  },
]

export function getArticle(slug: string) {
  return ARTICLES.find((article) => article.slug === slug)
}
