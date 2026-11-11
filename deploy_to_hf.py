"""Deploy the Fruit Freshness Detection Space to Hugging Face Hub.

Usage:
    python deploy_to_hf.py --token <HF_WRITE_TOKEN> --repo-id <USERNAME>/fruit-freshness-detection
Or:
    $env:HF_TOKEN="hf_..."
    python deploy_to_hf.py --repo-id <USERNAME>/fruit-freshness-detection
"""

import argparse
import os
import sys
from pathlib import Path
from huggingface_hub import HfApi, login

def main():
    parser = argparse.ArgumentParser(description="Deploy Fruit Freshness Detection Space to Hugging Face")
    parser.add_argument("--token", type=str, default=os.getenv("HF_TOKEN"), help="Hugging Face Write Access Token")
    parser.add_argument("--repo-id", type=str, required=True, help="Repository ID, e.g. 'username/fruit-freshness-detection'")
    parser.add_argument("--repo-type", type=str, default="space", choices=["space", "model"], help="Target repo type")
    
    args = parser.parse_args()

    token = args.token
    if not token:
        token = input("Enter your Hugging Face Write Token (starts with 'hf_...'): ").strip()
    
    if not token:
        print("Error: Hugging Face token is required.", file=sys.stderr)
        sys.exit(1)

    print("Authenticating with Hugging Face...")
    login(token=token, add_to_git_credential=True)
    
    api = HfApi(token=token)
    user_info = api.whoami()
    username = user_info.get("name", "Unknown")
    print(f"Logged in successfully as: @{username}")

    repo_id = args.repo_id
    if "/" not in repo_id:
        repo_id = f"{username}/{repo_id}"

    space_sdk = "gradio" if args.repo_type == "space" else None
    print(f"Ensuring {args.repo_type} repository '{repo_id}' exists...")
    api.create_repo(
        repo_id=repo_id,
        repo_type=args.repo_type,
        space_sdk=space_sdk,
        exist_ok=True,
    )

    source_dir = Path(__file__).parent / "hf_space"
    if not source_dir.exists():
        print(f"Error: {source_dir} not found.", file=sys.stderr)
        sys.exit(1)

    print(f"Uploading files from '{source_dir}' to '{repo_id}' on Hugging Face...")
    print("This includes the trained model weights (~24.9 MB). Please wait...")

    api.upload_folder(
        folder_path=str(source_dir),
        repo_id=repo_id,
        repo_type=args.repo_type,
        commit_message="Deploy Fruit Freshness Detection Space with Gradio UI",
    )

    url = f"https://huggingface.co/spaces/{repo_id}" if args.repo_type == "space" else f"https://huggingface.co/{repo_id}"
    print("\n" + "=" * 60)
    print(" SUCCESS! Deployment complete!")
    print(f" Your live app is available at:")
    print(f"   {url}")
    print("=" * 60)

if __name__ == "__main__":
    main()

