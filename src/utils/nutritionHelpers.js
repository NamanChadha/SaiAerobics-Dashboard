import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Normalize height input to centimeters
 * Accepts: 165, 5'5, 5ft 5in, etc.
 * Returns: { valid: boolean, value: number|null, error: string|null }
 */
export function normalizeHeight(input) {
    if (!input || typeof input !== 'string') {
        return { valid: false, value: null, error: "Height is required" };
    }

    const trimmed = input.trim();

    // Case 1: Already in centimeters (numeric only)
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
        const cm = parseFloat(trimmed);
        if (cm < 50 || cm > 300) {
            return { valid: false, value: null, error: "Height must be between 50-300 cm" };
        }
        return { valid: true, value: cm, error: null };
    }

    // Case 2: Feet and inches format (5'5, 5'5", 5ft 5in, etc.)
    const feetInchesPattern = /^(\d+)(?:ft|')\s*(\d+)?(?:in|")?$/i;
    const match = trimmed.match(feetInchesPattern);

    if (match) {
        const feet = parseInt(match[1], 10);
        const inches = match[2] ? parseInt(match[2], 10) : 0;

        if (feet < 0 || feet > 9 || inches < 0 || inches >= 12) {
            return { valid: false, value: null, error: "Invalid feet/inches format" };
        }

        // Convert to cm: 1 foot = 30.48 cm, 1 inch = 2.54 cm
        const cm = (feet * 30.48) + (inches * 2.54);

        if (cm < 50 || cm > 300) {
            return { valid: false, value: null, error: "Height must be between 50-300 cm" };
        }

        return { valid: true, value: Math.round(cm * 10) / 10, error: null };
    }

    return { valid: false, value: null, error: "Invalid format. Use: 165 or 5'5 or 5ft 5in" };
}

/**
 * Validate weight input
 * Returns: { valid: boolean, value: number|null, error: string|null }
 */
export function validateWeight(weight) {
    if (!weight) {
        return { valid: false, value: null, error: "Weight is required" };
    }

    const num = parseFloat(weight);

    if (isNaN(num)) {
        return { valid: false, value: null, error: "Weight must be a number" };
    }

    if (num <= 0) {
        return { valid: false, value: null, error: "Weight must be greater than 0" };
    }

    if (num < 30) {
        return { valid: false, value: null, error: "Weight must be at least 30 kg" };
    }

    if (num > 300) {
        return { valid: false, value: null, error: "Weight cannot exceed 300 kg" };
    }

    return { valid: true, value: num, error: null };
}

/**
 * Sanitize macro data from AI response
 * Ensures all values are numbers, defaults missing to 0, clamps absurd values
 */
export function sanitizeMacros(mealData) {
    if (!mealData || typeof mealData !== 'object') {
        return { meal: "-", calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    // If it's just a string, return basic structure
    if (typeof mealData === 'string') {
        return { meal: mealData, calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    const clamp = (value, min, max) => {
        const num = parseFloat(value) || 0;
        return Math.max(min, Math.min(max, num));
    };

    return {
        meal: mealData.meal || "-",
        portions: mealData.portions || "",
        calories: clamp(mealData.calories, 0, 5000),
        protein: clamp(mealData.protein, 0, 500),
        carbs: clamp(mealData.carbs, 0, 500),
        fat: clamp(mealData.fat, 0, 500)
    };
}

/**
 * Generate a stable seed for meal plan consistency
 */
export function generateMealPlanSeed() {
    return Date.now();
}

/**
 * Generate PDF for meal plan
 */
export function generatePDF(generatedPlan, formData) {
    if (!generatedPlan) {
        throw new Error("No meal plan data provided");
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(232, 93, 117);
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Sai Aerobics", pageWidth / 2, 18, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`7-Day ${formData.goal} Meal Plan`, pageWidth / 2, 28, { align: "center" });
    doc.text(`Diet: ${formData.diet} | ${new Date().toLocaleDateString()}`, pageWidth / 2, 35, { align: "center" });

    doc.setTextColor(0, 0, 0);

    const days = ["day1", "day2", "day3", "day4", "day5", "day6", "day7"];
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const mealTypes = ["breakfast", "lunch", "dinner", "snacks"];
    const mealLabels = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" };

    const getMealData = (dayPlan, mealType) => {
        if (!dayPlan || !dayPlan[mealType]) {
            return sanitizeMacros(null);
        }
        return sanitizeMacros(dayPlan[mealType]);
    };

    const getDayTotals = (dayPlan) => {
        let calories = 0, protein = 0, carbs = 0, fat = 0;
        mealTypes.forEach(type => {
            const m = getMealData(dayPlan, type);
            calories += m.calories || 0;
            protein += m.protein || 0;
            carbs += m.carbs || 0;
            fat += m.fat || 0;
        });
        return { calories, protein, carbs, fat };
    };

    const tableBody = [];
    days.forEach((day, idx) => {
        const dayPlan = generatedPlan[day] || {};
        const totals = getDayTotals(dayPlan);

        mealTypes.forEach((mealType, mealIdx) => {
            const m = getMealData(dayPlan, mealType);
            const foodWithPortions = m.portions ? `${m.meal}\n${m.portions}` : m.meal || "-";
            const row = [
                mealIdx === 0 ? dayNames[idx] : "",
                mealLabels[mealType],
                foodWithPortions,
                m.calories || "-",
                `P:${m.protein || 0}g C:${m.carbs || 0}g F:${m.fat || 0}g`
            ];
            tableBody.push(row);
        });

        tableBody.push([
            "",
            { content: "Day Total", styles: { fontStyle: "bold", fillColor: [240, 240, 240] } },
            "",
            { content: `${totals.calories} kcal`, styles: { fontStyle: "bold", fillColor: [240, 240, 240] } },
            { content: `P:${totals.protein}g C:${totals.carbs}g F:${totals.fat}g`, styles: { fontStyle: "bold", fillColor: [240, 240, 240] } }
        ]);
    });

    autoTable(doc, {
        head: [["Day", "Meal", "Food Item", "Calories", "Macros"]],
        body: tableBody,
        startY: 50,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [232, 93, 117], textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: {
            0: { cellWidth: 22, fontStyle: "bold" },
            1: { cellWidth: 20 },
            2: { cellWidth: 70 },
            3: { cellWidth: 20 },
            4: { cellWidth: 45 }
        }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Generated by Sai Aerobics - Stay healthy!", pageWidth / 2, finalY, { align: "center" });

    const fileName = `SaiAerobics_${formData.goal.replace(/\s+/g, "_")}_MealPlan.pdf`;
    doc.save(fileName);
}

/**
 * Generate email HTML for meal plan
 */
export function generateEmailHTML(generatedPlan, formData) {
    if (!generatedPlan) {
        throw new Error("No meal plan data provided");
    }

    const days = ["day1", "day2", "day3", "day4", "day5", "day6", "day7"];
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const mealTypes = ["breakfast", "lunch", "dinner", "snacks"];
    const mealLabels = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks" };

    const getMealData = (dayPlan, mealType) => {
        if (!dayPlan || !dayPlan[mealType]) {
            return sanitizeMacros(null);
        }
        return sanitizeMacros(dayPlan[mealType]);
    };

    const getDayTotals = (dayPlan) => {
        let calories = 0, protein = 0, carbs = 0, fat = 0;
        mealTypes.forEach(type => {
            const m = getMealData(dayPlan, type);
            calories += m.calories || 0;
            protein += m.protein || 0;
            carbs += m.carbs || 0;
            fat += m.fat || 0;
        });
        return { calories, protein, carbs, fat };
    };

    let html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #E85D75, #f687a5); padding: 25px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Sai Aerobics</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Your 7-Day ${formData.goal} Meal Plan</p>
      </div>
      <div style="padding: 20px; background: #f9fafb;">
        <p style="margin: 0 0 15px 0;"><strong>Diet:</strong> ${formData.diet}</p>
  `;

    days.forEach((day, idx) => {
        const dayPlan = generatedPlan[day] || {};
        const totals = getDayTotals(dayPlan);

        html += `
      <div style="background: white; border-radius: 10px; padding: 15px; margin-bottom: 12px; border-left: 4px solid #E85D75;">
        <h3 style="margin: 0 0 10px 0; color: #E85D75;">${dayNames[idx]} <span style="font-size: 12px; color: #666; font-weight: normal;">(${totals.calories} kcal)</span></h3>
    `;

        mealTypes.forEach(mealType => {
            const m = getMealData(dayPlan, mealType);
            html += `
        <div style="margin: 8px 0; padding: 8px; background: #f9fafb; border-radius: 6px;">
          <strong style="color: #E85D75;">${mealLabels[mealType]}:</strong> ${m.meal}
          ${m.portions ? `<br/><span style="color: #888; font-size: 11px;">📏 ${m.portions}</span>` : ''}
          <span style="color: #666; font-size: 12px; display: block; margin-top: 4px;">${m.calories} kcal | P:${m.protein}g C:${m.carbs}g F:${m.fat}g</span>
        </div>
      `;
        });

        html += `</div>`;
    });

    html += `
      </div>
      <div style="text-align: center; padding: 20px; background: #E85D75; border-radius: 0 0 12px 12px;">
        <p style="color: white; margin: 0;">Stay healthy! 💪 - Sai Aerobics Team</p>
      </div>
    </div>
  `;

    return html;
}
