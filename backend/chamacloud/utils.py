import re

def normalize_phone(phone):
    """
    Forces any Kenyan phone number format into standard E.164 (+254...)
    
    Handles:
    - 07xxxxxxxx -> +2547xxxxxxxx
    - 01xxxxxxxx -> +2541xxxxxxxx
    - 2547xxxxxxxx -> +2547xxxxxxxx
    - +2547xxxxxxxx -> +2547xxxxxxxx
    - Strips all spaces and dashes.
    """
    if not phone:
        return phone
        
    # Remove any spaces, dashes, or existing plus signs to get a clean string
    clean_phone = str(phone).strip().replace(" ", "").replace("-", "").replace("+", "")
    
    # If they typed 07... or 01... (Kenyan local format)
    if clean_phone.startswith("0"):
        return "+254" + clean_phone[1:]
    
    # If they typed 254... (which is now just 254 since we stripped the +)
    elif clean_phone.startswith("254"):
        return "+" + clean_phone
        
    # Fallback for international or already cleanly formatted numbers
    return "+" + clean_phone