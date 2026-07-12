import argparse
import json
import sys
from .client import TradiaClient, TradiaError


def main():
    parser = argparse.ArgumentParser(prog="tradia", description="Agentic trading intelligence")
    parser.add_argument("--version", action="version", version="0.1.0")
    parser.add_argument("--cloud", action="store_true", help="Use cloud API")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("health", help="Check API health")
    sub.add_parser("whoami", help="Show configuration")

    for name, help_text in [
        ("agent-plan", "Generate agent trading plan"),
        ("market-analyze", "Analyze market context"),
        ("signal", "Evaluate trading signal"),
        ("risk", "Check risk parameters"),
        ("propose", "Generate trade proposal"),
        ("journal", "Journal a trade"),
        ("performance", "Analyze performance"),
        ("report", "Generate portfolio report"),
        ("public-update", "Generate public update"),
        ("backtest", "Run backtest simulation"),
        ("accountability", "Generate accountability card"),
    ]:
        p = sub.add_parser(name.replace("-", "_"), help=help_text)
        if name == "signal":
            p.add_argument("--symbol", "--symbol", dest="symbol")
            p.add_argument("--strategy", "--strategy", dest="strategy")
            p.add_argument("--context", "--context", dest="context")
            p.add_argument("--timeframe", "--timeframe", dest="timeframe")
        else:
            p.add_argument("--input", "-i", help="JSON input file")
            p.add_argument("--data", "-d", help="JSON string input")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    client = TradiaClient() if not args.cloud else TradiaClient(use_cloud=True)

    try:
        if args.command == "health":
            print(json.dumps(client.health(), indent=2))
        elif args.command == "whoami":
            print(f"Tradia v0.1.0")
            print(f"API key: {'set' if client.api_key else 'not set'}")
            print(f"Base URL: {client.base_url}")
        elif args.command == "signal":
            kwargs = {k: getattr(args, k) for k in ["symbol", "strategy", "context", "timeframe"] if getattr(args, k, None)}
            result = client.signal_evaluate(**kwargs)
            print(json.dumps(result, indent=2))
        else:
            data = {}
            if args.input:
                with open(args.input) as f:
                    data = json.load(f)
            elif args.data:
                data = json.loads(args.data)
            method_map = {
                "agent-plan": client.agent_plan,
                "market-analyze": client.market_analyze,
                "risk": client.risk_check,
                "propose": client.trade_propose,
                "journal": client.trade_journal,
                "performance": client.performance_analyze,
                "report": client.portfolio_report,
                "public-update": client.public_update_generate,
                "backtest": client.backtest_simulate,
                "accountability": client.accountability_card,
            }
            fn = method_map.get(args.command.replace("_", "-"))
            if fn:
                result = fn(**data)
                print(json.dumps(result, indent=2))
    except TradiaError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
