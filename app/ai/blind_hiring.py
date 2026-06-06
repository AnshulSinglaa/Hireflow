import json


def apply_blind_filter(candidate_data: dict, application_id: int) -> dict:
    """
    When blind hiring is ON — strip identifying information.
    Replace with anonymous identifier.
    """
    return {
        "application_id": application_id,
        "candidate_id": f"Candidate #{chr(65 + (application_id % 26))}{application_id}",
        "name": f"Candidate #{chr(65 + (application_id % 26))}{application_id}",
        "email": "hidden",
        "photo": None,
        "skills": candidate_data.get("skills", []),
        "experience_years": candidate_data.get("experience_years"),
        "ats_score": candidate_data.get("ats_score"),
        "pipeline_score": candidate_data.get("pipeline_score"),
        "similarity_score": candidate_data.get("similarity_score"),
        "status": candidate_data.get("status"),
        "blind_mode": True
    }


def filter_candidate_response(
    candidate_data: dict,
    application_id: int,
    blind_hiring: bool
) -> dict:
    """
    Apply blind filter if blind_hiring is enabled.
    Otherwise return full data.
    """
    if blind_hiring:
        return apply_blind_filter(candidate_data, application_id)
    return candidate_data
