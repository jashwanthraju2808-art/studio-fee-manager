from fastapi import APIRouter

router = APIRouter(
    prefix="/members",
    tags=["Members"]
)

members = []

@router.get("/")
def get_members():
    return members

@router.post("/")
def add_member(member: dict):
    members.append(member)
    return {
        "message": "Member added successfully",
        "member": member
    }