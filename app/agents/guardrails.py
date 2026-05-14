import json
from typing import Callable

# ─────────────────────────────────────────
# GUARDRAIL RULES
# ─────────────────────────────────────────

IRREVERSIBLE_ACTIONS = [
    "send_email",
    "reject_candidate", 
    "delete_application",
    "update_status"
]

RATE_LIMITS = {
    "emails_per_run": 50,
    "api_calls_per_run": 100
}

class GuardrailViolation(Exception):
    pass

class AgentGuardrails:
    def __init__(self, dry_run: bool = False, require_approval: bool = True):
        self.dry_run = dry_run
        self.require_approval = require_approval
        self.actions_taken = []
        self.emails_sent = 0
        self.api_calls = 0
        self.violations = []

    def check_rate_limits(self):
        if self.emails_sent >= RATE_LIMITS["emails_per_run"]:
            raise GuardrailViolation(
                f"Rate limit exceeded: max {RATE_LIMITS['emails_per_run']} emails per run"
            )
        if self.api_calls >= RATE_LIMITS["api_calls_per_run"]:
            raise GuardrailViolation(
                f"Rate limit exceeded: max {RATE_LIMITS['api_calls_per_run']} API calls per run"
            )

    def before_action(self, action_name: str, action_details: dict) -> bool:
        print(f"\n[GUARDRAIL] Checking action: {action_name}")

        # Rate limit check
        self.check_rate_limits()

        # Dry run mode — simulate but never execute
        if self.dry_run:
            print(f"[GUARDRAIL] DRY RUN — would execute: {action_name}({action_details})")
            self.actions_taken.append({
                "action": action_name,
                "details": action_details,
                "executed": False,
                "reason": "dry_run"
            })
            return False

        # Human in the loop for irreversible actions
        if action_name in IRREVERSIBLE_ACTIONS and self.require_approval:
            print(f"\n⚠️  HUMAN APPROVAL REQUIRED")
            print(f"   Action: {action_name}")
            print(f"   Details: {json.dumps(action_details, indent=2)}")
            
            approval = input("   Approve? (y/n): ").strip().lower()
            
            if approval != "y":
                print(f"[GUARDRAIL] ❌ Action rejected by human")
                self.violations.append({
                    "action": action_name,
                    "reason": "rejected_by_human"
                })
                return False

        self.actions_taken.append({
            "action": action_name,
            "details": action_details,
            "executed": True
        })
        return True

    def after_action(self, action_name: str):
        if "email" in action_name.lower():
            self.emails_sent += 1
        self.api_calls += 1

    def get_report(self) -> dict:
        return {
            "total_actions": len(self.actions_taken),
            "executed": len([a for a in self.actions_taken if a.get("executed")]),
            "blocked": len([a for a in self.actions_taken if not a.get("executed")]),
            "violations": self.violations,
            "emails_sent": self.emails_sent,
            "api_calls": self.api_calls
        }
