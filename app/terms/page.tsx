import type { Metadata } from "next"

import { LegalPage, type LegalSection } from "@/components/legal-page"
import { LEGAL, LEGAL_LAST_UPDATED } from "../lib/legal"

export const metadata: Metadata = { title: "Terms of Service" }

const sections: LegalSection[] = [
  {
    heading: "About these terms",
    body: [
      `These terms are an agreement between you and ${LEGAL.operatorName} ("we", "us"). They cover your use of the Latli app, which helps shops that buy products for customers manage orders, customers, shops, payments and deliveries.`,
      "By creating an account or using Latli you agree to these terms and to our Privacy Policy. If you do not agree, do not use Latli.",
      "You must be at least 13 years old to use Latli. If you use Latli for a business, you confirm that you are allowed to act for it.",
    ],
  },
  {
    heading: "Your account",
    body: [
      "You must give accurate information when you register, including your age, and keep it up to date.",
      "You are responsible for keeping your password private and for everything that happens under your account. Tell us straight away if you think someone else has used it.",
      "One account is for one shop. Do not share your login with people outside your shop.",
    ],
  },
  {
    heading: "What Latli does",
    body: [
      "Latli lets you record customers, shops and the products they sell, cargo companies and customer orders, track whether each order is bought, sent, delivered or complete, and track what customers have paid.",
      "Latli is a record-keeping tool. We do not buy products, take payments, deliver goods or take part in any sale between you and your customers or suppliers.",
      "Figures such as totals, profit and balances are calculated from what you enter. Check them yourself before you rely on them.",
    ],
  },
  {
    heading: "Free and Pro plans",
    body: [
      "Latli has a Free plan and a Pro plan. Plans differ in the features they include, such as how long photos are kept and whether screenshots can be read with AI.",
      [
        "Free: photos are deleted 7 days after they are saved.",
        "Pro: photos are also deleted after 7 days unless you choose Keep photos for a month. That keeps them for 30 days from the day you press it, and you can press it again later to extend them.",
        "Pro: managers can have order screenshots read with Gemini (see section 7).",
      ],
      "Plans, features and any price may change. We will tell you before a change that makes your plan worse. Your plan is set on your account by us, and you cannot change it yourself.",
      `To upgrade to Pro, or to raise a support ticket, contact ${LEGAL.contactEmail}.`,
    ],
  },
  {
    heading: "Your content",
    body: [
      "Everything you enter or upload, such as customer details, orders, notes, photos and screenshots, is your content. You keep all rights to it.",
      "You give us permission to store, process and show your content only as needed to run Latli for you. That includes sending a screenshot to Gemini when you use that feature.",
      "You are responsible for your content. You confirm that you have the right to store the information you enter, including your customers' names, phone numbers and addresses, and that you handle it lawfully and fairly. Only enter what you need to run your business.",
    ],
  },
  {
    heading: "Photos are deleted automatically",
    body: [
      "Photos and screenshots are deleted automatically on their deletion date. Deleted photos cannot be recovered by you or by us.",
      "The date is shown next to the photo. After a photo is deleted, the order or product stays, but the photo is gone.",
      "Keep your own copy of any photo you need for longer. We are not responsible for losses caused by a photo being deleted as described here.",
    ],
  },
  {
    heading: "Reading screenshots with AI",
    body: [
      "On the Pro plan, managers can upload a chat screenshot and have Latli read it with Google's Gemini service to fill in an order. Other accounts read screenshots on their own device.",
      "AI can make mistakes: it may misread names, phone numbers, sizes or prices, or leave things out. Always check what was filled in before you save an order. You are responsible for the orders you save.",
      "Do not upload a screenshot unless you are allowed to share what it shows with a service provider.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "You agree not to:",
      [
        "break the law or use Latli to cheat, threaten or harass anyone;",
        "store information you have no right to hold, or that belongs to someone else without permission;",
        "try to reach another person's account or data, or to get around any limit or security measure, including trying to change your own plan or the date a photo is deleted;",
        "send large amounts of automated requests, or attack, overload or interfere with Latli;",
        "copy, resell or reverse engineer Latli, except where the law allows it.",
      ],
    ],
  },
  {
    heading: "Availability and changes to Latli",
    body: [
      "We work to keep Latli running but we do not promise it will always be available or free of errors. We may change, add or remove features, or stop Latli, and we will try to give notice of major changes.",
      "Keep your own records of anything important. Latli is not a back-up service.",
    ],
  },
  {
    heading: "Suspending or closing accounts",
    body: [
      "You can stop using Latli at any time. To have your account and its data deleted, contact us.",
      "We may suspend or close an account if you break these terms, if your use puts others or Latli at risk, or if the law requires it. Where we reasonably can, we will tell you why.",
    ],
  },
  {
    heading: "No warranty",
    body: [
      'Latli is provided "as is" and "as available". To the fullest extent the law allows, we give no promises that Latli will meet your needs, be accurate, be secure at all times or run without interruption.',
    ],
  },
  {
    heading: "Limit of our responsibility",
    body: [
      "To the fullest extent the law allows, we are not responsible for indirect or consequential losses, lost profit, lost sales, lost data or lost photos, or for what happens between you and your customers, suppliers or cargo companies.",
      "Where the law does not allow us to exclude our responsibility, it is limited to the smallest amount the law permits. Nothing in these terms limits rights you have under the law that cannot be limited.",
    ],
  },
  {
    heading: "Changes to these terms",
    body: [
      "We may update these terms. When we make an important change we will tell you in the app or by email, and the date at the top will change. If you keep using Latli after a change takes effect, you accept the new terms. If you do not agree, stop using Latli and ask us to delete your account.",
    ],
  },
  ...(LEGAL.governingLaw
    ? [
        {
          heading: "Governing law",
          body: [
            `These terms are governed by ${LEGAL.governingLaw}. This does not remove any rights you have under the consumer laws where you live.`,
          ],
        },
      ]
    : []),
  ...(LEGAL.contactEmail
    ? [
        {
          heading: "Contact us",
          body: [
            `Questions about these terms, or want your account deleted? Write to ${LEGAL.contactEmail}.`,
          ],
        },
      ]
    : []),
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated={LEGAL_LAST_UPDATED}
      intro="Please read these terms before you create an account. They explain what you can expect from Latli and what we expect from you."
      sections={sections}
      otherPage={{ href: "/privacy", label: "Privacy Policy" }}
    />
  )
}
