import type { Metadata } from "next"

import { LegalPage, type LegalSection } from "@/components/legal-page"
import { LEGAL, LEGAL_LAST_UPDATED } from "../lib/legal"
import { translateTo } from "@/lib/i18n/runtime"

// The Terms and Privacy Policy are shown in English for now.
const t: T = (text, vars) => translateTo("en", text, vars)

type T = (text: string, vars?: Record<string, string | number>) => string

function buildSections(t: T): LegalSection[] {
  return [
  {
    heading: t("Who this covers"),
    body: [
      t("This policy explains what personal information {operatorName} (\"we\", \"us\") collects when you use the Latli app, why, who sees it, and what choices you have.", { operatorName: LEGAL.operatorName }),
      t("There are two groups of people. You, the shop owner or staff member with a Latli account. And your customers, whose details you enter into Latli. Section 3 explains the difference."),
    ],
  },
  {
    heading: t("Information we collect"),
    body: [
      t("From you when you register and use your account:"),
      [
        t("Email address and password. Your password is stored only as a hash, so we cannot read it."),
        t("Shop name, owner name and age. Gender is optional."),
        t("Phone number and address, if you add them on your profile."),
        t("When you agreed to the Terms of Service and this policy."),
        t("Your plan (Free or Pro) and your role, which we set."),
      ],
      t("Information you enter about your business:"),
      [
        t("Customers: name, Facebook name, phone number, address and other contacts."),
        t("Shops and products: shop name, contact, phone or LINE, location, notes, and product names, prices and variants such as colour and size."),
        t("Cargo companies: name, phone, location and notes."),
        t("Orders: customer details, product details, prices, costs, what has been paid, order status, shop, and any notes or customer messages."),
      ],
      t("Photos and screenshots you upload, such as product photos and chat screenshots. A chat screenshot can show other people's names, messages and phone numbers."),
      t("Technical information: to keep you logged in we use a session cookie (see section 7). Our hosting and database providers may also record technical details such as IP address and device type in their logs for security and reliability."),
    ],
  },
  {
    heading: t("Your customers' information"),
    body: [
      t("When you enter a customer's details or upload a screenshot of a conversation, you decide what is collected and why. For that information, you are responsible for having a lawful reason to hold it, for being open with your customers about it, and for entering no more than you need."),
      t("We store and process it only to provide Latli to you, and we do not use your customers' details for our own purposes or for advertising."),
      t("If a customer asks you to see, correct or delete their details, you can edit or remove their records in Latli. If you need our help, contact us."),
    ],
  },
  {
    heading: t("How we use information"),
    body: [
      [
        t("To create your account, log you in and keep it secure."),
        t("To store your records and show them to you."),
        t("To read order screenshots, if you use that feature (see section 5)."),
        t("To delete photos on schedule and to apply your plan."),
        t("To fix problems, prevent misuse and meet legal duties."),
        t("To contact you about your account, for example to confirm your email, answer you or tell you about changes to our terms."),
      ],
      t("We do not sell your information and we do not show advertising."),
    ],
  },
  {
    heading: t("Who we share it with"),
    body: [
      t("We use service providers to run Latli. They may handle your information only to provide their service to us."),
      [
        t("Supabase provides login, the database and file storage. Your account, records and photos are held there."),
        t("Google provides the Gemini service. This is used only when a manager on the Pro plan chooses to read a screenshot. The screenshot is sent to Gemini to extract the order details and is handled under Google's terms for that service. If you do not want a screenshot sent to Google, do not upload it on a Pro manager account. Other accounts read screenshots on their own device, and nothing is sent to Google."),
        t("Our hosting provider runs the app's servers."),
      ],
      t("We may also share information if the law requires it, to protect people's safety or our rights, or as part of a sale or transfer of our business, in which case we will tell you."),
    ],
  },
  {
    heading: t("Photos and how long we keep them"),
    body: [
      t("Photos and screenshots are stored in a private location that only you can reach. They are deleted automatically 7 days after they are saved. Accounts on the Pro plan can press Keep photos for a month, which keeps them for 30 days from that day, and can press it again to extend them."),
      t("Once a photo is deleted it cannot be recovered. The order or product it belonged to stays, without the photo."),
    ],
  },
  {
    heading: t("Cookies"),
    body: [
      t("Latli uses only the cookies needed to keep you signed in. They are essential, so the app cannot work without them. We do not use advertising or tracking cookies."),
    ],
  },
  {
    heading: t("How long we keep your information"),
    body: [
      [
        t("Account details and business records: until you ask us to delete your account."),
        t("Photos and screenshots: 7 days, or up to 30 days from the day a Pro account chooses to keep them, as described above."),
        t("Backups and logs kept by our providers may hold information for a short time after it is deleted."),
      ],
      t("When your account is deleted, your profile and records are deleted with it. We may keep a small amount of information if the law requires it."),
    ],
  },
  {
    heading: t("Security"),
    body: [
      t("We protect your information with measures such as hashed passwords, encrypted connections, private file storage, and rules that let each account see only its own records."),
      t("No system is perfectly secure. Choose a strong password, do not share it, and log out on shared devices."),
    ],
  },
  {
    heading: t("Your choices and rights"),
    body: [
      [
        t("See and change your shop name, owner name, phone, address, age and gender on the Profile page."),
        t("Edit or delete customers, shops, products and orders in the app."),
        t("Ask us for a copy of your information, to correct it, or to delete your account and its data."),
        t("Ask us to stop using your information in a way you do not agree with, or complain to the data protection authority where you live."),
      ],
      t("Depending on where you live, you may have more rights under your local law. We respect them."),
    ],
  },
  {
    heading: t("Children"),
    body: [
      t("Latli is not for children under 13, and we do not knowingly collect information from them. If you think a child has given us information, contact us and we will delete it."),
    ],
  },
  {
    heading: t("Where information is processed"),
    body: [
      t("Our providers run servers in several countries, so your information may be stored or processed outside the country where you live. Where this happens we use providers that protect it in line with this policy."),
    ],
  },
  {
    heading: t("Changes to this policy"),
    body: [
      t("We may update this policy. When we make an important change we will tell you in the app or by email, and the date at the top will change."),
    ],
  },
  ...(LEGAL.contactEmail
    ? [
        {
          heading: t("Contact us"),
          body: [
            t("Questions about your privacy, or want to use any of your rights? Write to {contactEmail}. The same address takes support tickets and requests to upgrade to Pro.", { contactEmail: LEGAL.contactEmail }),
          ],
        },
      ]
    : []),
  ]
}

export function generateMetadata(): Metadata {
  return { title: t("Privacy Policy") }
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title={t("Privacy Policy")}
      updated={t(LEGAL_LAST_UPDATED)}
      intro={t("This policy explains in plain words what we collect, why, who sees it, and the choices you have.")}
      sections={buildSections(t)}
      otherPage={{ href: "/terms", label: t("Terms of Service") }}
    />
  )
}
