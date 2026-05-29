#!/usr/bin/env python3
import argparse
import os
import smtplib
from email.message import EmailMessage


def env_required(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def build_message(sender: str, to: str, subject: str, text: str) -> EmailMessage:
    message = EmailMessage()
    message["From"] = sender
    message["To"] = to
    message["Subject"] = subject
    message.set_content(text)
    message.add_alternative(
        f"""
        <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8">
          {''.join(f'<p>{line}</p>' for line in text.splitlines() if line.strip())}
        </div>
        """,
        subtype="html",
    )
    return message


def send_email(to: str, subject: str, text: str) -> None:
    gmail_user = env_required("GMAIL_USER")
    gmail_app_password = env_required("GMAIL_APP_PASSWORD")
    sender = os.environ.get("EMAIL_FROM", gmail_user)

    message = build_message(sender, to, subject, text)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
        smtp.login(gmail_user, gmail_app_password)
        smtp.send_message(message)


def main() -> None:
    parser = argparse.ArgumentParser(description="Send an email via Gmail SMTP.")
    parser.add_argument("--to", required=True, help="Recipient email address")
    parser.add_argument("--subject", default="دمت گرم", help="Email subject")
    parser.add_argument(
        "--message",
        default="علی جان،\n\nخیلی دمت گرمه، حال کردم.\n",
        help="Plain text email message",
    )
    args = parser.parse_args()

    send_email(args.to, args.subject, args.message)
    print(f"Email sent to {args.to}")


if __name__ == "__main__":
    main()
