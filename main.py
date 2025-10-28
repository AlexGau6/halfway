import tkinter as tk
from tkinter import messagebox
import requests

def get_distance():
    origin = entry_origin.get()
    destination = entry_destination.get()
    api_key = entry_api.get()

    if not origin or not destination or not api_key:
        messagebox.showerror("Input Error", "Please fill in all fields.")
        return

    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": origin,
        "destinations": destination,
        "key": api_key
    }

    try:
        response = requests.get(url, params=params)
        data = response.json()

        if data["status"] == "OK":
            element = data["rows"][0]["elements"][0]
            if element["status"] == "OK":
                distance = element["distance"]["text"]
                duration = element["duration"]["text"]
                result_label.config(text=f"Distance: {distance}\nDuration: {duration}")
            else:
                result_label.config(text=f"Error: {element['status']}")
        else:
            result_label.config(text=f"Error: {data['status']}")
    except Exception as e:
        messagebox.showerror("API Error", str(e))

# GUI setup
root = tk.Tk()
root.title("Google Maps Distance Finder")
root.geometry("400x300")

tk.Label(root, text="Origin:").pack(pady=5)
entry_origin = tk.Entry(root, width=50)
entry_origin.pack()

tk.Label(root, text="Destination:").pack(pady=5)
entry_destination = tk.Entry(root, width=50)
entry_destination.pack()

tk.Label(root, text="Google Maps API Key:").pack(pady=5)
entry_api = tk.Entry(root, width=50, show="*")
entry_api.pack()

tk.Button(root, text="Calculate Distance", command=get_distance).pack(pady=10)

result_label = tk.Label(root, text="", font=("Arial", 12), justify="center")
result_label.pack(pady=10)

root.mainloop()
